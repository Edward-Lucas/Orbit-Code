/**
 * Coordinator Safety Policy for Orbit Code
 *
 * Defines access control and mutation policies for the Coordinator MCP server.
 * Ported from gajae-code, adapted for MiMo-Code's architecture.
 */

import * as path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CoordinatorMutationClass = "sessions" | "questions" | "reports";

export interface CoordinatorNamespace {
  profile: string | null;
  repo: string | null;
}

export interface CoordinatorMcpConfig {
  allowedRoots: string[];
  mutationClasses: Set<CoordinatorMutationClass>;
  artifactByteCap: number;
  namespace: CoordinatorNamespace;
  stateRoot: string;
  sessionCommand: string | null;
}

export interface CoordinatorMutationRequest {
  allow_mutation?: boolean;
}

export interface CoordinatorSafetyConfig {
  allowedRoots: string[];
  artifactMaxBytes: number;
  enabledMutationClasses: Set<CoordinatorMutationClass>;
  repo?: string;
  profile?: string;
}

export interface CoordinatorSafetyPolicy {
  config: CoordinatorSafetyConfig;
  resolveWorkdir(input: unknown): string;
  assertMutationAllowed(
    mutationClass: CoordinatorMutationClass,
    args: Record<string, unknown>,
  ): { ok: true } | CoordinatorFailure;
}

export interface CoordinatorFailure {
  ok: false;
  reason: string;
  [key: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_ARTIFACT_BYTE_CAP = 64 * 1024;
const MAX_ARTIFACT_BYTE_CAP = 1024 * 1024;
const MUTATION_CLASSES = new Set<CoordinatorMutationClass>([
  "sessions",
  "questions",
  "reports",
]);
const LEGACY_MUTATION_CLASS_ALIASES = new Map<string, CoordinatorMutationClass>(
  [
    ["session", "sessions"],
    ["prompt", "sessions"],
    ["question", "questions"],
    ["report", "reports"],
  ],
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\n,;:]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseRootList(value: string | undefined): string[] {
  const normalized = (value ?? "").replace(/[\n,;]+/g, path.delimiter);
  return normalized
    .split(path.delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseMutationClasses(
  value: string | undefined,
): Set<CoordinatorMutationClass> {
  const classes = new Set<CoordinatorMutationClass>();
  for (const raw of parseList(value)) {
    const normalized = raw.toLowerCase();
    if (normalized === "all") {
      for (const mutationClass of MUTATION_CLASSES) classes.add(mutationClass);
      continue;
    }
    const mutationClass =
      LEGACY_MUTATION_CLASS_ALIASES.get(normalized) ?? normalized;
    if (MUTATION_CLASSES.has(mutationClass as CoordinatorMutationClass)) {
      classes.add(mutationClass as CoordinatorMutationClass);
    }
  }
  return classes;
}

function parseByteCap(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_ARTIFACT_BYTE_CAP;
  return Math.min(parsed, MAX_ARTIFACT_BYTE_CAP);
}

function cleanScope(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[^a-zA-Z0-9_.-]+/g, "-").slice(0, 100) || null;
}

function isInside(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

// ─── Config Builder ──────────────────────────────────────────────────────────

export function buildCoordinatorMcpConfig(
  env: NodeJS.ProcessEnv = process.env,
): CoordinatorMcpConfig {
  const stateRootOverride = env.ORBIT_COORDINATOR_MCP_STATE_ROOT?.trim();
  const sessionPrefix = env.ORBIT_SESSION_ID?.trim() ?? "default";
  const defaultStateRoot = path.join(
    process.cwd(),
    ".orbit",
    "state",
    "coordinator-mcp",
  );
  const stateRoot = stateRootOverride || defaultStateRoot;
  return {
    allowedRoots: parseRootList(env.ORBIT_COORDINATOR_MCP_WORKDIR_ROOTS).map(
      (root) => path.resolve(root),
    ),
    mutationClasses: parseMutationClasses(
      env.ORBIT_COORDINATOR_MCP_MUTATIONS ??
        env.ORBIT_COORDINATOR_MCP_ENABLE_MUTATION_CLASSES,
    ),
    artifactByteCap: parseByteCap(
      env.ORBIT_COORDINATOR_MCP_ARTIFACT_BYTE_CAP ??
        env.ORBIT_COORDINATOR_MCP_ARTIFACT_MAX_BYTES,
    ),
    namespace: {
      profile: cleanScope(env.ORBIT_COORDINATOR_MCP_PROFILE),
      repo: cleanScope(env.ORBIT_COORDINATOR_MCP_REPO),
    },
    stateRoot: path.resolve(stateRoot),
    sessionCommand: env.ORBIT_COORDINATOR_MCP_SESSION_COMMAND?.trim() || null,
  };
}

// ─── Assertion Functions ─────────────────────────────────────────────────────

export function assertCoordinatorWorkdir(
  config: CoordinatorMcpConfig,
  cwd: unknown,
): string {
  if (typeof cwd !== "string" || cwd.trim().length === 0) {
    throw new Error("coordinator_workdir_required");
  }
  if (config.allowedRoots.length === 0) {
    throw new Error("coordinator_workdir_roots_required");
  }
  const requested = path.resolve(cwd);
  if (
    !config.allowedRoots.some((root) => isInside(requested, path.resolve(root)))
  ) {
    throw new Error(`coordinator_workdir_outside_allowed_roots:${requested}`);
  }
  return requested;
}

export function assertCoordinatorArtifactPath(
  config: CoordinatorMcpConfig,
  artifactPath: unknown,
): { path: string; byteCap: number } {
  if (typeof artifactPath !== "string" || artifactPath.trim().length === 0) {
    throw new Error("coordinator_artifact_path_required");
  }
  if (config.allowedRoots.length === 0) {
    throw new Error("coordinator_artifact_roots_required");
  }
  const requested = path.resolve(artifactPath);
  if (
    !config.allowedRoots.some((root) => isInside(requested, path.resolve(root)))
  ) {
    throw new Error(`coordinator_artifact_outside_allowed_roots:${requested}`);
  }
  return { path: requested, byteCap: config.artifactByteCap };
}

export function requireCoordinatorMutation(
  config: CoordinatorMcpConfig,
  mutationClass: CoordinatorMutationClass,
  request: CoordinatorMutationRequest,
): void {
  if (!config.mutationClasses.has(mutationClass)) {
    throw new Error(`coordinator_mutation_class_disabled:${mutationClass}`);
  }
  if (request.allow_mutation !== true) {
    throw new Error(`coordinator_mutation_call_not_allowed:${mutationClass}`);
  }
}

export function coordinatorNamespacePath(config: CoordinatorMcpConfig): string {
  return path.join(
    config.stateRoot,
    config.namespace.profile ?? "unscoped-profile",
    config.namespace.repo ?? "unscoped-repo",
  );
}

// ─── Safety Policy Factory ───────────────────────────────────────────────────

function toSafetyConfig(config: CoordinatorMcpConfig): CoordinatorSafetyConfig {
  return {
    allowedRoots: config.allowedRoots,
    artifactMaxBytes: config.artifactByteCap,
    enabledMutationClasses: config.mutationClasses,
    repo: config.namespace.repo ?? undefined,
    profile: config.namespace.profile ?? undefined,
  };
}

function toFailure(error: unknown): CoordinatorFailure {
  const message = error instanceof Error ? error.message : String(error);
  const [rawReason, detail] = message.split(":", 2);
  const reason = rawReason.replace(/^coordinator_/, "");
  return detail === undefined
    ? { ok: false, reason }
    : { ok: false, reason, detail };
}

export function createCoordinatorSafetyPolicy(
  options: { env?: NodeJS.ProcessEnv } = {},
): CoordinatorSafetyPolicy {
  const canonicalConfig = buildCoordinatorMcpConfig(options.env ?? process.env);
  const config = toSafetyConfig(canonicalConfig);
  return {
    config,
    resolveWorkdir(input: unknown): string {
      return assertCoordinatorWorkdir(canonicalConfig, input);
    },
    assertMutationAllowed(
      mutationClass: CoordinatorMutationClass,
      args: Record<string, unknown>,
    ): { ok: true } | CoordinatorFailure {
      try {
        requireCoordinatorMutation(canonicalConfig, mutationClass, args);
        return { ok: true };
      } catch (error) {
        return toFailure(error);
      }
    },
  };
}
