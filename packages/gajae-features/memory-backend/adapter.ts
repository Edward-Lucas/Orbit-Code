/**
 * Memory Backend Adapter for Orbit Code
 *
 * Connects gajae-features memory backend interface with MiMo's memory/service.ts.
 * This adapter allows the Coordinator system to use MiMo's FTS5-based memory
 * while supporting gajae's pluggable backend architecture.
 */

import type {
  MemoryBackend,
  MemoryBackendStartOptions,
  MemoryBackendId,
} from "./types";

// ─── MiMo Memory Service Interface ──────────────────────────────────────────

/**
 * Minimal interface matching MiMo's memory/service.ts Service type.
 * Avoids importing from mimo-core directly to keep the dependency boundary clean.
 */
export interface MiMoMemoryService {
  root(): Promise<string>;
  reconcile(): Promise<{ indexed: number; pruned: number }>;
  search(input: {
    query: string;
    scope?: string;
    scope_id?: string;
    type?: string;
    limit?: number;
  }): Promise<
    Array<{
      path: string;
      snippet: string;
      score: number;
      scope: string;
      scope_id: string;
      type: string;
    }>
  >;
}

// ─── Adapter Backend ─────────────────────────────────────────────────────────

/**
 * Creates a MemoryBackend that delegates to MiMo's memory service.
 * This bridges gajae's pluggable backend interface with MiMo's Effect-TS service.
 */
export function createMiMoAdapterBackend(
  mimoMemory: MiMoMemoryService,
): MemoryBackend {
  return {
    id: "local" as MemoryBackendId,

    start(_options: MemoryBackendStartOptions) {
      // MiMo's memory service handles its own initialization through Effect layers.
      // Trigger reconcile on startup to index any new memory files.
      try {
        const result = mimoMemory.reconcile();
        if (result && typeof (result as Promise<any>).catch === "function") {
          (result as Promise<any>).catch(() => {});
        }
      } catch {
        // Non-throwing: backend startup failures must not break the agent loop.
      }
    },

    async buildDeveloperInstructions(
      _agentDir: string,
      cwd: string,
      _sessionID?: string,
    ) {
      // MiMo's memory service provides search-based context injection.
      // The checkpoint system handles MEMORY.md injection separately.
      // Try to get memory root for future context injection.
      try {
        const root = await mimoMemory.root();
        // Root path available for future memory context injection.
        // Currently returns undefined to let the default system prompt handle it.
        return undefined;
      } catch {
        return undefined;
      }
    },

    async clear(_agentDir: string, _cwd: string, _sessionID?: string) {
      // MiMo's memory is file-based (checkpoint.md, MEMORY.md).
      // Clearing requires session-level operations handled by checkpoint.ts.
    },

    async enqueue(_agentDir: string, _cwd: string, _sessionID?: string) {
      // Force reconcile to pick up any new memory files.
      try {
        const result = mimoMemory.reconcile();
        if (result && typeof (result as Promise<any>).then === "function") {
          await result;
        }
      } catch {
        // Non-throwing.
      }
    },
  };
}

// ─── Resolver with Adapter ───────────────────────────────────────────────────

export interface MemoryBackendConfig {
  backend?: MemoryBackendId;
  enabled?: boolean;
}

/**
 * Resolve the active memory backend.
 * When mimoMemory is provided and backend is "local", creates an adapter backend.
 * Otherwise falls back to off/no-op.
 */
export function resolveMemoryBackendWithAdapter(
  config: MemoryBackendConfig,
  mimoMemory?: MiMoMemoryService,
): MemoryBackend {
  if (config.backend === "local" && mimoMemory) {
    return createMiMoAdapterBackend(mimoMemory);
  }
  if (config.backend === "local") {
    // No MiMo service available — return stub local backend
    return {
      id: "local",
      start() {},
      async buildDeveloperInstructions() {
        return undefined;
      },
      async clear() {},
      async enqueue() {},
    };
  }
  return {
    id: "off",
    start() {},
    async buildDeveloperInstructions() {
      return undefined;
    },
    async clear() {},
    async enqueue() {},
  };
}
