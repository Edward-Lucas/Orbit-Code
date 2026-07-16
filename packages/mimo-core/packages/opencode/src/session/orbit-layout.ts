/**
 * Orbit Session Layout Adapter
 *
 * Bridges gajae-features/gjc-runtime/session-layout.ts with MiMo's session system.
 * Provides .orbit/ directory structure for persistent Coordinator state.
 */

import {
  ORBIT_DIR,
  ORBIT_SESSION_PREFIX,
  orbitRoot,
  sessionRoot,
  sessionDirName,
  sessionIdFromDirName,
  sessionStateDir,
  sessionPlansDir,
  sessionReportsDir,
  sessionLogsDir,
  sessionRuntimeDir,
  coordinatorMcpStateRoot,
  modeStatePath,
  teamStateRoot,
  auditPath,
  encodeSessionSegment,
  decodeSessionSegment,
  assertNonEmptySessionId,
  assertSafePathComponent,
  type OrbitSessionSource,
  type OrbitSessionContext,
} from "../../../../../gajae-features/gjc-runtime/session-layout"

import {
  ORBIT_DEFAULT_TMUX_SESSION,
  ORBIT_TMUX_SESSION_PREFIX,
  ORBIT_TMUX_COMMAND_ENV,
  resolveOrbitTmuxCommand,
  sanitizeTmuxToken,
  buildOrbitTmuxSessionSlug,
  buildOrbitTmuxSessionName,
  normalizeTmuxCreatedAt,
  type TmuxCommandResult,
  type TmuxCommandRunner,
} from "../../../../../gajae-features/gjc-runtime/tmux-common"

// Re-export everything for convenience
export {
  // Constants
  ORBIT_DIR,
  ORBIT_SESSION_PREFIX,
  ORBIT_DEFAULT_TMUX_SESSION,
  ORBIT_TMUX_SESSION_PREFIX,
  ORBIT_TMUX_COMMAND_ENV,
  // Session layout functions
  orbitRoot,
  sessionRoot,
  sessionDirName,
  sessionIdFromDirName,
  sessionStateDir,
  sessionPlansDir,
  sessionReportsDir,
  sessionLogsDir,
  sessionRuntimeDir,
  coordinatorMcpStateRoot,
  modeStatePath,
  teamStateRoot,
  auditPath,
  encodeSessionSegment,
  decodeSessionSegment,
  assertNonEmptySessionId,
  assertSafePathComponent,
  // Tmux functions
  resolveOrbitTmuxCommand,
  sanitizeTmuxToken,
  buildOrbitTmuxSessionSlug,
  buildOrbitTmuxSessionName,
  normalizeTmuxCreatedAt,
  // Types
  type OrbitSessionSource,
  type OrbitSessionContext,
  type TmuxCommandResult,
  type TmuxCommandRunner,
}

// ─── MiMo Integration Helpers ─────────────────────────────────────────────────

import { Instance } from "../project/instance"
import * as Session from "./session"

/**
 * Get the orbit root directory for the current project.
 */
export function getOrbitRoot(): string {
  return orbitRoot(Instance.directory)
}

/**
 * Get the session root directory for a given session ID.
 */
export function getSessionRoot(sessionId: string): string {
  return sessionRoot(Instance.directory, sessionId)
}

/**
 * Get the plans directory for a given session ID.
 */
export function getSessionPlansDir(sessionId: string): string {
  return sessionPlansDir(Instance.directory, sessionId)
}

/**
 * Get the reports directory for a given session ID.
 */
export function getSessionReportsDir(sessionId: string): string {
  return sessionReportsDir(Instance.directory, sessionId)
}

/**
 * Get the runtime directory for a given session ID.
 */
export function getSessionRuntimeDir(sessionId: string): string {
  return sessionRuntimeDir(Instance.directory, sessionId)
}

/**
 * Get the coordinator MCP state root for a given session ID.
 */
export function getCoordinatorStateRoot(sessionId: string): string {
  return coordinatorMcpStateRoot(Instance.directory, sessionId)
}
