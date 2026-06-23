/**
 * Tmux Common Utilities for Orbit Code
 *
 * Core tmux session management utilities for the Coordinator system.
 * Ported from gajae-code gjc-runtime/tmux-common.ts,
 * adapted for Orbit Code.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

export const ORBIT_DEFAULT_TMUX_SESSION = "orbit_code";
export const ORBIT_TMUX_SESSION_PREFIX = `${ORBIT_DEFAULT_TMUX_SESSION}_`;
export const ORBIT_TMUX_COMMAND_ENV = "ORBIT_TMUX_COMMAND";
export const ORBIT_TMUX_PROFILE_OPTION = "@orbit-profile";
export const ORBIT_TMUX_PROFILE_VALUE = "1";
export const ORBIT_TMUX_SESSION_ID_OPTION = "@orbit-session-id";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TmuxCommandResult {
  exitCode: number | null;
  stdout?: string;
  stderr?: string;
  signalCode?: string | null;
}

export type TmuxCommandRunner = (args: string[]) => TmuxCommandResult;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function envDisabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === "0" ||
    normalized === "false" ||
    normalized === "off" ||
    normalized === "no"
  );
}

export function resolveOrbitTmuxCommand(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env[ORBIT_TMUX_COMMAND_ENV]?.trim() || "tmux";
}

export function sanitizeTmuxToken(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "default"
  );
}

export function buildOrbitTmuxSessionSlug(value: string): string {
  return sanitizeTmuxToken(value);
}

function randomTmuxSessionSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function buildOrbitTmuxSessionName(
  env: NodeJS.ProcessEnv = process.env,
  context: { branch?: string | null; now?: number; id?: string } = {},
): string {
  const explicit =
    env.GJC_TMUX_SESSION?.trim() ?? env.ORBIT_TMUX_SESSION?.trim();
  if (explicit) return explicit;
  const timestamp = (context.now ?? Date.now()).toString(36);
  const id = context.id ?? randomTmuxSessionSuffix();
  const branchSlug = context.branch
    ? `${buildOrbitTmuxSessionSlug(context.branch)}_`
    : "";
  return `${ORBIT_TMUX_SESSION_PREFIX}${branchSlug}${timestamp}_${id}`;
}

export function buildGjcTmuxExactOptionTarget(sessionName: string): string {
  return `=${sessionName}:`;
}

export function normalizeTmuxCreatedAt(raw: string): string {
  const seconds = Number.parseInt(raw, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return raw;
  return new Date(seconds * 1000).toISOString();
}
