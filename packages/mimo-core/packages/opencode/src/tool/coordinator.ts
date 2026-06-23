import * as Tool from "./tool"
import z from "zod"
import { Effect } from "effect"
import { CoordinatorStateStore } from "../../../gajae-features/coordinator-mcp/server"

const id = "coordinator"

const listSessionsOperation = z.strictObject({
  action: z.literal("list_sessions"),
})

const startSessionOperation = z.strictObject({
  action: z.literal("start_session"),
  cwd: z.string().min(1).describe("Working directory for the session."),
  prompt: z.string().optional().describe("Initial prompt for the session."),
})

const sendPromptOperation = z.strictObject({
  action: z.literal("send_prompt"),
  session_id: z.string().min(1).describe("Target session ID."),
  prompt: z.string().min(1).describe("Prompt to send to the session."),
})

const readTurnOperation = z.strictObject({
  action: z.literal("read_turn"),
  turn_id: z.string().min(1).describe("Turn ID to read."),
})

const delegatePlanOperation = z.strictObject({
  action: z.literal("delegate_plan"),
  cwd: z.string().min(1).describe("Working directory for the plan."),
  task: z.string().min(1).describe("Task description for planning."),
})

const delegateExecuteOperation = z.strictObject({
  action: z.literal("delegate_execute"),
  cwd: z.string().min(1).describe("Working directory for execution."),
  task: z.string().min(1).describe("Task description for execution."),
})

const delegateTeamOperation = z.strictObject({
  action: z.literal("delegate_team"),
  cwd: z.string().min(1).describe("Working directory for the team."),
  task: z.string().min(1).describe("Task description for the team."),
  worker_count: z.number().int().min(1).max(20).optional().describe("Number of workers (default 3)."),
})

const watchEventsOperation = z.strictObject({
  action: z.literal("watch_events"),
  after_seq: z.number().int().optional().describe("Return events after this sequence number."),
  limit: z.number().int().optional().describe("Maximum number of events to return."),
})

const operationSchema = z.discriminatedUnion("action", [
  listSessionsOperation,
  startSessionOperation,
  sendPromptOperation,
  readTurnOperation,
  delegatePlanOperation,
  delegateExecuteOperation,
  delegateTeamOperation,
  watchEventsOperation,
])

// Singleton state store — lives for the lifetime of the process.
const store = new CoordinatorStateStore()

export const CoordinatorTool = Tool.define(
  id,
  Effect.succeed({
    description: [
      "Manage multi-agent coordination via the Coordinator system.",
      "",
      "Available actions:",
      "  list_sessions  — List all active coordinator sessions",
      "  start_session  — Start a new coordinator session",
      "  send_prompt    — Send a prompt to a session (creates a turn)",
      "  read_turn      — Read turn status and result",
      "  delegate_plan  — Delegate consensus planning to a new session",
      "  delegate_execute — Delegate execution to a new session",
      "  delegate_team  — Delegate parallel team execution",
      "  watch_events   — Watch the coordinator event journal",
    ].join("\n"),
    parameters: z.object({
      operation: operationSchema,
    }),
    execute: (args, ctx) =>
      Effect.gen(function* () {
        const op = args.operation
        let output: string

        switch (op.action) {
          case "list_sessions": {
            const sessions = store.listSessions()
            if (sessions.length === 0) {
              output = "No active coordinator sessions."
            } else {
              output = sessions
                .map((s) => `- ${s.sessionId} [${s.state}] turn=${s.currentTurnId ?? "none"}`)
                .join("\n")
            }
            break
          }

          case "start_session": {
            const session = store.startSession({ sessionId: `session-${Date.now()}`, cwd: op.cwd, prompt: op.prompt })
            output = `Session started: ${session.sessionId}\nState: ${session.state}\nCWD: ${op.cwd}`
            if (op.prompt) {
              const turn = store.sendPrompt({ sessionId: session.sessionId, prompt: op.prompt })
              output += `\nTurn created: ${turn.turnId}`
            }
            break
          }

          case "send_prompt": {
            const turn = store.sendPrompt({ sessionId: op.session_id, prompt: op.prompt })
            output = `Turn created: ${turn.turnId}\nSession: ${op.session_id}\nStatus: ${turn.status}`
            break
          }

          case "read_turn": {
            const turn = store.getTurn(op.turn_id)
            if (!turn) {
              output = `Turn not found: ${op.turn_id}`
            } else {
              const lines = [
                `Turn: ${turn.turnId}`,
                `Session: ${turn.sessionId}`,
                `Status: ${turn.status}`,
                `Prompt: ${turn.prompt.text.slice(0, 200)}`,
              ]
              if (turn.finalResponse.text) {
                lines.push(`Response: ${turn.finalResponse.text.slice(0, 500)}`)
              }
              if (turn.error) {
                lines.push(`Error: ${turn.error.code} — ${turn.error.message}`)
              }
              output = lines.join("\n")
            }
            break
          }

          case "delegate_plan": {
            const result = store.delegatePlan({ cwd: op.cwd, task: op.task })
            output = [
              `Plan delegation started`,
              `Session: ${result.sessionId}`,
              `Turn: ${result.turnId}`,
              `Task: ${op.task.slice(0, 200)}`,
            ].join("\n")
            break
          }

          case "delegate_execute": {
            const result = store.delegateExecute({ cwd: op.cwd, task: op.task })
            output = [
              `Execute delegation started`,
              `Session: ${result.sessionId}`,
              `Turn: ${result.turnId}`,
              `Task: ${op.task.slice(0, 200)}`,
            ].join("\n")
            break
          }

          case "delegate_team": {
            const result = store.delegateTeam({
              cwd: op.cwd,
              task: op.task,
              workerCount: op.worker_count,
            })
            output = [
              `Team delegation started`,
              `Leader: ${result.leaderSessionId}`,
              `Workers: ${result.workerSessionIds.join(", ")}`,
              `Task: ${op.task.slice(0, 200)}`,
            ].join("\n")
            break
          }

          case "watch_events": {
            const events = store.getEvents({
              afterSeq: op.after_seq,
              limit: op.limit ?? 20,
            })
            if (events.length === 0) {
              output = "No events."
            } else {
              output = events
                .map((e) => `[${e.seq}] ${e.kind} — ${e.summary}`)
                .join("\n")
            }
            break
          }
        }

        return {
          title: `coordinator ${op.action}`,
          output,
          metadata: {},
        }
      }),
  }),
)
