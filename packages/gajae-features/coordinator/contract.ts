/**
 * Coordinator Contract for Orbit Code
 *
 * Defines the MCP protocol constants and tool names for the Coordinator system.
 * Ported from gajae-code, adapted for MiMo-Code's architecture.
 *
 * The Coordinator manages multi-agent sessions via MCP (Model Context Protocol),
 * enabling task delegation, session orchestration, and team-based parallel execution.
 */

// ─── Protocol Constants ──────────────────────────────────────────────────────

export const COORDINATOR_MCP_PROTOCOL_VERSION = "2024-11-05";
export const COORDINATOR_MCP_SERVER_NAME = "orbit-coordinator-mcp";

// ─── Tool Names ──────────────────────────────────────────────────────────────

export const COORDINATOR_MCP_TOOL_NAMES = [
  // Session management
  "coordinator_list_sessions",
  "coordinator_read_status",
  "coordinator_read_tail",
  "coordinator_register_session",
  "coordinator_start_session",
  // Turn management
  "coordinator_send_prompt",
  "coordinator_read_turn",
  "coordinator_await_turn",
  // Questions
  "coordinator_list_questions",
  "coordinator_submit_question_answer",
  // Artifacts
  "coordinator_list_artifacts",
  "coordinator_read_artifact",
  // Reports
  "coordinator_report_status",
  "coordinator_read_coordination_status",
  // Events
  "coordinator_watch_events",
  // Delegation
  "coordinator_delegate_plan",
  "coordinator_delegate_execute",
  "coordinator_delegate_team",
] as const;

export type CoordinatorToolName = (typeof COORDINATOR_MCP_TOOL_NAMES)[number];

// ─── Session State ───────────────────────────────────────────────────────────

export type CoordinatorSessionState =
  | "booting"
  | "ready_for_input"
  | "running"
  | "needs_user_input"
  | "completed"
  | "errored"
  | "stale"
  | "unknown";

export interface CoordinatorSession {
  sessionId: string;
  state: CoordinatorSessionState;
  readyForInput: boolean;
  currentTurnId: string | null;
  lastTurnId: string | null;
  updatedAt: string;
  source: "coordinator" | "agent_session_event";
  live: boolean | null;
  reason: string | null;
}

// ─── Turn State ──────────────────────────────────────────────────────────────

export type TurnStatus =
  | "queued"
  | "delivering"
  | "active"
  | "waiting_for_answer"
  | "completing"
  | "completed"
  | "failed"
  | "cancelled"
  | "superseded";

export interface TurnRecord {
  turnId: string;
  sessionId: string;
  status: TurnStatus;
  prompt: {
    text: string;
    createdAt: string;
    source: "mcp" | "question_answer";
  };
  delivery: {
    delivered: boolean;
    queued: boolean;
    target: string | null;
  };
  questionIds: string[];
  finalResponse: {
    text: string | null;
    format: "markdown";
    source: string | null;
    artifactPath: string | null;
    truncated: boolean;
  };
  error: { code: string; message: string; recoverable: boolean } | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ─── Event System ────────────────────────────────────────────────────────────

export type CoordinatorEventKind =
  | "session.registered"
  | "session.started"
  | "session.state_changed"
  | "turn.queued"
  | "turn.delivering"
  | "turn.active"
  | "turn.waiting_for_answer"
  | "turn.completed"
  | "turn.failed"
  | "turn.cancelled"
  | "turn.superseded"
  | "question.opened"
  | "question.answered"
  | "report.written"
  | "delegation.started";

export interface CoordinatorEvent {
  seq: number;
  id: string;
  timestamp: string;
  kind: CoordinatorEventKind;
  sessionId?: string;
  turnId?: string;
  questionId?: string;
  reportId?: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

// ─── Delegation ──────────────────────────────────────────────────────────────

export type DelegateWorkflow = "plan" | "execute" | "team";

export interface DelegatePlanInput {
  cwd: string;
  task: string;
  sessionId?: string;
  model?: string;
  awaitCompletion?: boolean;
  timeoutMs?: number;
}

export interface DelegateExecuteInput {
  cwd: string;
  task: string;
  sessionId?: string;
  model?: string;
  awaitCompletion?: boolean;
  timeoutMs?: number;
}

export interface DelegateTeamInput {
  cwd: string;
  task: string;
  sessionId?: string;
  model?: string;
  workerCount?: number;
  awaitCompletion?: boolean;
  timeoutMs?: number;
}

// ─── Namespace ───────────────────────────────────────────────────────────────

export interface CoordinatorNamespace {
  profile: string | null;
  repo: string | null;
}
