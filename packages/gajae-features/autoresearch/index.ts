/**
 * Autoresearch System for Orbit Code
 *
 * Experimental optimization loop for automated benchmarking and improvement.
 * Ported from gajae-code coding-agent/src/autoresearch/,
 * adapted for Orbit Code. No external dependencies.
 *
 * Core components:
 * - Types: Experiment state, results, metrics
 * - State: Experiment state management, confidence computation
 * - Helpers: Metric parsing, formatting, path matching
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type MetricDirection = "lower" | "higher";
export type ExperimentStatus = "keep" | "discard" | "crash" | "checks_failed";

export type ASIValue =
  | string
  | number
  | boolean
  | null
  | ASIValue[]
  | { [key: string]: ASIValue };

export interface ASIData {
  [key: string]: ASIValue;
}

export interface NumericMetricMap {
  [key: string]: number;
}

export interface MetricDef {
  name: string;
  unit: string;
}

export interface ExperimentResult {
  runNumber: number | null;
  commit: string;
  metric: number;
  metrics: NumericMetricMap;
  status: ExperimentStatus;
  description: string;
  timestamp: number;
  segment: number;
  confidence: number | null;
  asi?: ASIData;
  modifiedPaths: string[];
  scopeDeviations: string[];
  justification: string | null;
  flagged: boolean;
  flaggedReason: string | null;
}

export interface ExperimentState {
  results: ExperimentResult[];
  bestMetric: number | null;
  bestDirection: MetricDirection;
  metricName: string;
  metricUnit: string;
  secondaryMetrics: MetricDef[];
  name: string | null;
  goal: string | null;
  currentSegment: number;
  maxExperiments: number | null;
  confidence: number | null;
  scopePaths: string[];
  offLimits: string[];
  constraints: string[];
  notes: string;
  branch: string | null;
  baselineCommit: string | null;
}

export interface PendingRunSummary {
  command: string;
  durationSeconds: number | null;
  parsedAsi: ASIData | null;
  parsedMetrics: NumericMetricMap | null;
  parsedPrimary: number | null;
  passed: boolean;
  preRunDirtyPaths: string[];
  runDirectory: string;
  runNumber: number;
  exitCode: number | null;
  timedOut: boolean;
}

export interface RunningExperiment {
  startedAt: number;
  command: string;
  runDirectory: string;
  runNumber: number;
}

export interface AutoresearchRuntime {
  autoresearchMode: boolean;
  autoResumeArmed: boolean;
  dashboardExpanded: boolean;
  lastAutoResumePendingRunNumber: number | null;
  lastRunDuration: number | null;
  lastRunAsi: ASIData | null;
  lastRunArtifactDir: string | null;
  lastRunNumber: number | null;
  lastRunSummary: PendingRunSummary | null;
  runningExperiment: RunningExperiment | null;
  state: ExperimentState;
  goal: string | null;
}

// ─── State Factory ───────────────────────────────────────────────────────────

export function createExperimentState(): ExperimentState {
  return {
    results: [],
    bestMetric: null,
    bestDirection: "lower",
    metricName: "metric",
    metricUnit: "",
    secondaryMetrics: [],
    name: null,
    goal: null,
    currentSegment: 0,
    maxExperiments: null,
    confidence: null,
    scopePaths: [],
    offLimits: [],
    constraints: [],
    notes: "",
    branch: null,
    baselineCommit: null,
  };
}

export function createRuntime(): AutoresearchRuntime {
  return {
    autoresearchMode: false,
    autoResumeArmed: false,
    dashboardExpanded: false,
    lastAutoResumePendingRunNumber: null,
    lastRunDuration: null,
    lastRunAsi: null,
    lastRunArtifactDir: null,
    lastRunNumber: null,
    lastRunSummary: null,
    runningExperiment: null,
    state: createExperimentState(),
    goal: null,
  };
}

export function createRuntimeStore(): {
  clear(sessionKey: string): void;
  ensure(sessionKey: string): AutoresearchRuntime;
} {
  const runtimes = new Map<string, AutoresearchRuntime>();
  return {
    clear(sessionKey: string): void {
      runtimes.delete(sessionKey);
    },
    ensure(sessionKey: string): AutoresearchRuntime {
      const existing = runtimes.get(sessionKey);
      if (existing) return existing;
      const runtime = createRuntime();
      runtimes.set(sessionKey, runtime);
      return runtime;
    },
  };
}

// ─── State Queries ───────────────────────────────────────────────────────────

export function currentResults(
  results: ExperimentResult[],
  segment: number,
): ExperimentResult[] {
  return results.filter((result) => result.segment === segment);
}

export function findBaselineResult(
  results: ExperimentResult[],
  segment: number,
): ExperimentResult | null {
  return (
    currentResults(results, segment).find(
      (r) => r.status === "keep" && !r.flagged,
    ) ?? null
  );
}

export function findBaselineMetric(
  results: ExperimentResult[],
  segment: number,
): number | null {
  const baseline = findBaselineResult(results, segment);
  return baseline ? baseline.metric : null;
}

export function findBaselineRunNumber(
  results: ExperimentResult[],
  segment: number,
): number | null {
  const baseline = findBaselineResult(results, segment);
  if (!baseline) return null;
  if (baseline.runNumber !== null) return baseline.runNumber;
  const index = results.indexOf(baseline);
  return index >= 0 ? index + 1 : null;
}

export function findBestKeptMetric(
  results: ExperimentResult[],
  segment: number,
  direction: MetricDirection,
): number | null {
  let best: number | null = null;
  for (const result of currentResults(results, segment)) {
    if (result.status !== "keep" || result.flagged) continue;
    if (best === null || isBetter(result.metric, best, direction)) {
      best = result.metric;
    }
  }
  return best;
}

// ─── Confidence ──────────────────────────────────────────────────────────────

export function sortedMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function computeConfidence(
  results: ExperimentResult[],
  segment: number,
  direction: MetricDirection,
): number | null {
  const current = currentResults(results, segment).filter(
    (r) => !r.flagged && r.metric > 0,
  );
  if (current.length < 3) return null;

  const values = current.map((r) => r.metric);
  const median = sortedMedian(values);
  const mad = sortedMedian(values.map((v) => Math.abs(v - median)));
  if (mad === 0) return null;

  const baseline = findBaselineMetric(results, segment);
  if (baseline === null) return null;

  let bestKept: number | null = null;
  for (const result of current) {
    if (result.status !== "keep" || result.metric <= 0) continue;
    if (bestKept === null || isBetter(result.metric, bestKept, direction)) {
      bestKept = result.metric;
    }
  }
  if (bestKept === null || bestKept === baseline) return null;

  return Math.abs(bestKept - baseline) / mad;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const METRIC_LINE_PREFIX = "METRIC";
export const ASI_LINE_PREFIX = "ASI";

const DENIED_KEY_NAMES = new Set(["__proto__", "constructor", "prototype"]);

export function isBetter(
  current: number,
  best: number,
  direction: MetricDirection,
): boolean {
  return direction === "lower" ? current < best : current > best;
}

export function inferMetricUnitFromName(name: string): string {
  if (name.endsWith("µs") || name.endsWith("_µs")) return "µs";
  if (name.endsWith("ms") || name.endsWith("_ms")) return "ms";
  if (name.endsWith("_s") || name.endsWith("_sec") || name.endsWith("_secs"))
    return "s";
  if (name.endsWith("_kb") || name.endsWith("kb")) return "kb";
  if (name.endsWith("_mb") || name.endsWith("mb")) return "mb";
  return "";
}

export function parseMetricLines(output: string): Map<string, number> {
  const metrics = new Map<string, number>();
  const regex = new RegExp(
    `^${METRIC_LINE_PREFIX}\\s+([\\w.µ-]+)=(\\S+)\\s*$`,
    "gm",
  );
  let match = regex.exec(output);
  while (match !== null) {
    const name = match[1];
    if (!DENIED_KEY_NAMES.has(name)) {
      const value = Number(match[2]);
      if (Number.isFinite(value)) {
        metrics.set(name, value);
      }
    }
    match = regex.exec(output);
  }
  return metrics;
}

export function parseAsiLines(output: string): ASIData | null {
  const asi: ASIData = {};
  const regex = new RegExp(`^${ASI_LINE_PREFIX}\\s+([\\w.-]+)=(.+)\\s*$`, "gm");
  let match = regex.exec(output);
  while (match !== null) {
    const key = match[1];
    if (!DENIED_KEY_NAMES.has(key)) {
      asi[key] = parseAsiValue(match[2]);
    }
    match = regex.exec(output);
  }
  return Object.keys(asi).length > 0 ? asi : null;
}

function parseAsiValue(raw: string): ASIValue {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  if (value.startsWith("{") || value.startsWith("[") || value.startsWith('"')) {
    try {
      return JSON.parse(value) as ASIValue;
    } catch {
      return value;
    }
  }
  return value;
}

export function commas(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.trunc(Math.abs(value)));
  const groups: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) {
    groups.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return sign + groups.join(",");
}

export function fmtNum(value: number, decimals: number = 0): string {
  if (decimals <= 0) return commas(Math.round(value));
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const fraction = (absolute - whole).toFixed(decimals).slice(1);
  return `${value < 0 ? "-" : ""}${commas(whole)}${fraction}`;
}

export function formatNum(value: number | null, unit: string): string {
  if (value === null) return "-";
  if (Number.isInteger(value)) return `${fmtNum(value)}${unit}`;
  return `${fmtNum(value, 2)}${unit}`;
}

export function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export function normalizePathSpec(value: string): string {
  const trimmed = value.trim().replaceAll("\\", "/");
  if (trimmed === "" || trimmed === "." || trimmed === "./") return ".";
  const collapsed = trimmed.replace(/^\.\/+/, "").replace(/\/+$/, "");
  return collapsed.length === 0 ? "." : collapsed;
}

export function pathMatchesSpec(pathValue: string, specValue: string): boolean {
  const normalizedPath = normalizePathSpec(pathValue);
  const normalizedSpec = normalizePathSpec(specValue);
  if (normalizedSpec === ".") return true;
  return (
    normalizedPath === normalizedSpec ||
    normalizedPath.startsWith(`${normalizedSpec}/`)
  );
}

export function dedupeStrings(values: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function ensureNumericMetricMap(
  value: NumericMetricMap | undefined,
): NumericMetricMap {
  if (!value) return {};
  const out: NumericMetricMap = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (DENIED_KEY_NAMES.has(key)) continue;
    if (typeof entryValue === "number" && Number.isFinite(entryValue)) {
      out[key] = entryValue;
    }
  }
  return out;
}
