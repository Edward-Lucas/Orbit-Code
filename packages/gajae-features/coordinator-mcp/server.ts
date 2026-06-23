/**
 * Coordinator MCP Server for Orbit Code
 *
 * Core session/turn/event management for the Coordinator system.
 * Ported from gajae-code coordinator-mcp/server.ts (2275 lines),
 * distilled to essential types and state management.
 *
 * The full MCP protocol handler will be implemented when integrating
 * with MiMo's server/rpc system. This module provides the data layer.
 */

import { randomUUID } from "node:crypto"
import type {
	CoordinatorEvent,
	CoordinatorEventKind,
	CoordinatorSession,
	CoordinatorSessionState,
	TurnRecord,
	TurnStatus,
} from "../coordinator/contract"

// ─── In-Memory State Store ───────────────────────────────────────────────────

export class CoordinatorStateStore {
	private sessions = new Map<string, CoordinatorSession>()
	private turns = new Map<string, TurnRecord>()
	private events: CoordinatorEvent[] = []
	private nextSeq = 1

	// ── Session Management ────────────────────────────────────────────────

	registerSession(input: {
		sessionId: string
		cwd: string
	}): CoordinatorSession {
		const session: CoordinatorSession = {
			sessionId: input.sessionId,
			state: "ready_for_input",
			readyForInput: true,
			currentTurnId: null,
			lastTurnId: null,
			updatedAt: new Date().toISOString(),
			source: "coordinator",
			live: true,
			reason: null,
		}
		this.sessions.set(input.sessionId, session)
		this.appendEvent({
			kind: "session.registered",
			sessionId: input.sessionId,
			summary: `Session ${input.sessionId} registered`,
		})
		return session
	}

	startSession(input: {
		sessionId: string
		cwd: string
		prompt?: string
	}): CoordinatorSession {
		const session = this.registerSession(input)
		session.state = "running"
		this.appendEvent({
			kind: "session.started",
			sessionId: input.sessionId,
			summary: `Session ${input.sessionId} started`,
		})
		return session
	}

	getSession(sessionId: string): CoordinatorSession | undefined {
		return this.sessions.get(sessionId)
	}

	listSessions(): CoordinatorSession[] {
		return Array.from(this.sessions.values())
	}

	updateSessionState(sessionId: string, state: CoordinatorSessionState): void {
		const session = this.sessions.get(sessionId)
		if (!session) return
		session.state = state
		session.updatedAt = new Date().toISOString()
		this.appendEvent({
			kind: "session.state_changed",
			sessionId,
			summary: `Session ${sessionId} state → ${state}`,
		})
	}

	// ── Turn Management ───────────────────────────────────────────────────

	sendPrompt(input: {
		sessionId: string
		prompt: string
	}): TurnRecord {
		const session = this.sessions.get(input.sessionId)
		if (!session) {
			throw new Error(`Session ${input.sessionId} not found`)
		}

		const turnId = `turn-${randomUUID()}`
		const now = new Date().toISOString()
		const turn: TurnRecord = {
			turnId,
			sessionId: input.sessionId,
			status: "queued",
			prompt: {
				text: input.prompt,
				createdAt: now,
				source: "mcp",
			},
			delivery: {
				delivered: false,
				queued: true,
				target: null,
			},
			questionIds: [],
			finalResponse: {
				text: null,
				format: "markdown",
				source: null,
				artifactPath: null,
				truncated: false,
			},
			error: null,
			createdAt: now,
			updatedAt: now,
			startedAt: null,
			completedAt: null,
		}

		this.turns.set(turnId, turn)
		session.currentTurnId = turnId
		session.lastTurnId = turnId
		session.state = "running"
		session.readyForInput = false
		session.updatedAt = now

		this.appendEvent({
			kind: "turn.queued",
			sessionId: input.sessionId,
			turnId,
			summary: `Turn ${turnId} queued for session ${input.sessionId}`,
		})

		return turn
	}

	getTurn(turnId: string): TurnRecord | undefined {
		return this.turns.get(turnId)
	}

	updateTurnStatus(turnId: string, status: TurnStatus): void {
		const turn = this.turns.get(turnId)
		if (!turn) return
		const now = new Date().toISOString()
		turn.status = status
		turn.updatedAt = now

		if (status === "active" && !turn.startedAt) {
			turn.startedAt = now
		}
		if (status === "completed" || status === "failed" || status === "cancelled") {
			turn.completedAt = now
			// Update session state
			const session = this.sessions.get(turn.sessionId)
			if (session) {
				session.currentTurnId = null
				session.readyForInput = status === "completed"
				session.state = status === "completed" ? "ready_for_input" : "errored"
				session.updatedAt = now
			}
		}

		const eventKind = `turn.${status}` as CoordinatorEventKind
		this.appendEvent({
			kind: eventKind,
			sessionId: turn.sessionId,
			turnId,
			summary: `Turn ${turnId} → ${status}`,
		})
	}

	completeTurn(input: {
		turnId: string
		text: string
		artifactPath?: string
	}): void {
		const turn = this.turns.get(input.turnId)
		if (!turn) return
		turn.finalResponse = {
			text: input.text,
			format: "markdown",
			source: turn.sessionId,
			artifactPath: input.artifactPath ?? null,
			truncated: false,
		}
		this.updateTurnStatus(input.turnId, "completed")
	}

	failTurn(input: {
		turnId: string
		code: string
		message: string
		recoverable?: boolean
	}): void {
		const turn = this.turns.get(input.turnId)
		if (!turn) return
		turn.error = {
			code: input.code,
			message: input.message,
			recoverable: input.recoverable ?? false,
		}
		this.updateTurnStatus(input.turnId, "failed")
	}

	// ── Event Journal ─────────────────────────────────────────────────────

	private appendEvent(input: {
		kind: CoordinatorEventKind
		sessionId?: string
		turnId?: string
		questionId?: string
		reportId?: string
		summary: string
		metadata?: Record<string, string | number | boolean | null>
	}): CoordinatorEvent {
		const event: CoordinatorEvent = {
			seq: this.nextSeq++,
			id: randomUUID(),
			timestamp: new Date().toISOString(),
			kind: input.kind,
			sessionId: input.sessionId,
			turnId: input.turnId,
			questionId: input.questionId,
			reportId: input.reportId,
			summary: input.summary,
			metadata: input.metadata,
		}
		this.events.push(event)
		return event
	}

	getEvents(input?: {
		afterSeq?: number
		sessionId?: string
		eventTypes?: CoordinatorEventKind[]
		limit?: number
	}): CoordinatorEvent[] {
		let filtered = this.events
		if (input?.afterSeq !== undefined) {
			filtered = filtered.filter((e) => e.seq > input.afterSeq!)
		}
		if (input?.sessionId) {
			filtered = filtered.filter((e) => e.sessionId === input.sessionId)
		}
		if (input?.eventTypes && input.eventTypes.length > 0) {
			const types = new Set(input.eventTypes)
			filtered = filtered.filter((e) => types.has(e.kind))
		}
		if (input?.limit) {
			filtered = filtered.slice(-input.limit)
		}
		return filtered
	}

	// ── Delegation Helpers ────────────────────────────────────────────────

	delegatePlan(input: { cwd: string; task: string }): {
		sessionId: string
		turnId: string
	} {
		const sessionId = `plan-${randomUUID().slice(0, 8)}`
		this.startSession({ sessionId, cwd: input.cwd })
		const turn = this.sendPrompt({ sessionId, prompt: input.task })
		this.appendEvent({
			kind: "delegation.started",
			sessionId,
			turnId: turn.turnId,
			summary: `Plan delegation started: ${input.task.slice(0, 100)}`,
		})
		return { sessionId, turnId: turn.turnId }
	}

	delegateExecute(input: { cwd: string; task: string }): {
		sessionId: string
		turnId: string
	} {
		const sessionId = `exec-${randomUUID().slice(0, 8)}`
		this.startSession({ sessionId, cwd: input.cwd })
		const turn = this.sendPrompt({ sessionId, prompt: input.task })
		this.appendEvent({
			kind: "delegation.started",
			sessionId,
			turnId: turn.turnId,
			summary: `Execute delegation started: ${input.task.slice(0, 100)}`,
		})
		return { sessionId, turnId: turn.turnId }
	}

	delegateTeam(input: {
		cwd: string
		task: string
		workerCount?: number
	}): { leaderSessionId: string; workerSessionIds: string[] } {
		const leaderId = `team-leader-${randomUUID().slice(0, 8)}`
		this.startSession({ sessionId: leaderId, cwd: input.cwd })

		const workerCount = input.workerCount ?? 3
		const workerIds: string[] = []
		for (let i = 0; i < workerCount; i++) {
			const workerId = `team-worker-${i}-${randomUUID().slice(0, 8)}`
			this.startSession({ sessionId: workerId, cwd: input.cwd })
			workerIds.push(workerId)
		}

		this.appendEvent({
			kind: "delegation.started",
			sessionId: leaderId,
			summary: `Team delegation started: ${workerCount} workers`,
			metadata: { workerCount },
		})

		return { leaderSessionId: leaderId, workerSessionIds: workerIds }
	}
}
