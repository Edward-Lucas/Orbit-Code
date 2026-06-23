/**
 * Memory Backend System for Orbit Code
 *
 * Ported from gajae-code's memory-backend architecture.
 * Provides pluggable memory backends with 2-phase consolidation pipeline.
 * MiMo-Code의 memory/service.ts와 adapter 패턴으로 연결됩니다.
 */

// ─── Backend Types ───────────────────────────────────────────────────────────

export type MemoryBackendId = "off" | "local" | "hindsight";

export interface MemoryBackendStartOptions {
  sessionID: string;
  cwd: string;
  agentDir: string;
  taskDepth: number;
}

export interface MemoryBackend {
  readonly id: MemoryBackendId;

  /**
   * Wire background work or session subscriptions.
   * Called once per agent session at startup. Non-throwing.
   */
  start(options: MemoryBackendStartOptions): void | Promise<void>;

  /**
   * Markdown injected as system-prompt append section.
   */
  buildDeveloperInstructions(
    agentDir: string,
    cwd: string,
    sessionID?: string,
  ): Promise<string | undefined>;

  /** Wipe all persisted state for this backend. */
  clear(agentDir: string, cwd: string, sessionID?: string): Promise<void>;

  /** Force consolidation to happen now. */
  enqueue(agentDir: string, cwd: string, sessionID?: string): Promise<void>;
}

// ─── Off Backend (no-op) ─────────────────────────────────────────────────────

export const offBackend: MemoryBackend = {
  id: "off",
  start() {},
  async buildDeveloperInstructions() {
    return undefined;
  },
  async clear() {},
  async enqueue() {},
};

// ─── Local Backend ───────────────────────────────────────────────────────────

export const localBackend: MemoryBackend = {
  id: "local",
  start(_options) {
    // Local memory pipeline startup — reads session rollouts, generates
    // phase1 summaries, and runs phase2 consolidation if needed.
    // Implementation deferred to MiMo memory/service.ts adapter.
  },
  async buildDeveloperInstructions(_agentDir, _cwd, _sessionID) {
    // Returns memory summary markdown for prompt injection.
    return undefined;
  },
  async clear(_agentDir, _cwd) {
    // Clears all local memory state.
  },
  async enqueue(_agentDir, _cwd) {
    // Forces consolidation.
  },
};

// ─── Resolver ────────────────────────────────────────────────────────────────

export interface MemoryConfig {
  backend?: MemoryBackendId;
  enabled?: boolean;
}

/**
 * Pick the active memory backend from configuration.
 */
export function resolveMemoryBackend(config: MemoryConfig): MemoryBackend {
  if (config.backend === "local") return localBackend;
  // "hindsight" backend requires external service — defer to future integration
  // if (config.backend === "hindsight") return hindsightBackend
  return offBackend;
}
