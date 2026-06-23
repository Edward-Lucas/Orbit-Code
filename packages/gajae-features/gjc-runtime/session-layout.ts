/**
 * Session Layout for Orbit Code
 *
 * Pure path layout for session-scoped Coordinator workflow state.
 * Ported from gajae-code gjc-runtime/session-layout.ts,
 * adapted for Orbit Code's directory structure (.orbit/).
 *
 * Every generated/runtime artifact for a session lives under
 * `<cwd>/.orbit/_session-{encodedSessionId}/...`.
 */

import * as path from "node:path";

// ─── Constants ───────────────────────────────────────────────────────────────

export const ORBIT_DIR = ".orbit";
export const ORBIT_SESSION_PREFIX = "_session-";
export const ORBIT_SESSION_ACTIVITY_FILE = ".session-activity.json";

export type OrbitSessionSource = "flag" | "payload" | "env" | "latest";

export interface OrbitSessionContext {
  sessionId: string;
  sessionRoot: string;
  source: OrbitSessionSource;
}

// ─── Encoding ────────────────────────────────────────────────────────────────

export function encodeSessionSegment(value: string): string {
  return encodeURIComponent(value).replaceAll(".", "%2E");
}

export function decodeSessionSegment(segment: string): string {
  return decodeURIComponent(segment.replaceAll("%2E", "."));
}

export function assertNonEmptySessionId(
  value: string | undefined,
  source: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`a non-empty session id is required (${source})`);
  }
}

export function assertSafePathComponent(value: string, label: string): void {
  const trimmed = value.trim();
  if (trimmed === "") throw new Error(`${label} is required`);
  if (trimmed === "." || trimmed === ".." || /[/\\]/.test(trimmed)) {
    throw new Error(`${label} must be a safe path component: ${value}`);
  }
}

// ─── Root Path Resolvers ─────────────────────────────────────────────────────

export function orbitRoot(cwd: string): string {
  return path.join(cwd, ORBIT_DIR);
}

export function sessionRoot(cwd: string, sessionId: string): string {
  assertNonEmptySessionId(sessionId, "sessionRoot");
  return path.join(
    orbitRoot(cwd),
    `${ORBIT_SESSION_PREFIX}${encodeSessionSegment(sessionId)}`,
  );
}

export function sessionDirName(sessionId: string): string {
  assertNonEmptySessionId(sessionId, "sessionDirName");
  return `${ORBIT_SESSION_PREFIX}${encodeSessionSegment(sessionId)}`;
}

export function sessionIdFromDirName(name: string): string | undefined {
  if (!name.startsWith(ORBIT_SESSION_PREFIX)) return undefined;
  const suffix = name.slice(ORBIT_SESSION_PREFIX.length);
  if (suffix === "") return undefined;
  let decoded: string;
  try {
    decoded = decodeSessionSegment(suffix);
  } catch {
    return undefined;
  }
  return decoded.trim() === "" ? undefined : decoded;
}

export function sessionActivityPath(cwd: string, sessionId: string): string {
  return path.join(sessionRoot(cwd, sessionId), ORBIT_SESSION_ACTIVITY_FILE);
}

// ─── Per-Category Subdir Resolvers ───────────────────────────────────────────

export function sessionStateDir(cwd: string, sessionId: string): string {
  return path.join(sessionRoot(cwd, sessionId), "state");
}

export function sessionPlansDir(cwd: string, sessionId: string): string {
  return path.join(sessionRoot(cwd, sessionId), "plans");
}

export function sessionReportsDir(cwd: string, sessionId: string): string {
  return path.join(sessionRoot(cwd, sessionId), "reports");
}

export function sessionLogsDir(cwd: string, sessionId: string): string {
  return path.join(sessionRoot(cwd, sessionId), "logs");
}

export function sessionRuntimeDir(cwd: string, sessionId: string): string {
  return path.join(sessionRoot(cwd, sessionId), "runtime");
}

// ─── Nested Resolvers ────────────────────────────────────────────────────────

export function coordinatorMcpStateRoot(
  cwd: string,
  sessionId: string,
): string {
  return path.join(sessionStateDir(cwd, sessionId), "coordinator-mcp");
}

export function modeStatePath(
  cwd: string,
  sessionId: string,
  mode: string,
): string {
  assertSafePathComponent(mode, "mode");
  return path.join(sessionStateDir(cwd, sessionId), `${mode}-state.json`);
}

export function teamStateRoot(cwd: string, sessionId: string): string {
  return path.join(sessionStateDir(cwd, sessionId), "team");
}

export function auditPath(cwd: string, sessionId: string): string {
  return path.join(sessionStateDir(cwd, sessionId), "audit.jsonl");
}
