/**
 * Autoresearch Tool for Orbit Code
 *
 * Provides experiment management for automated benchmarking and optimization.
 * Integrates gajae-features/autoresearch module.
 */

import { Effect } from "effect"
import z from "zod"
import * as Tool from "./tool"
import {
  createExperimentState,
  createRuntime,
  createRuntimeStore,
  cloneExperimentState,
  currentResults,
  findBaselineResult,
  findBaselineMetric,
  findBestKeptMetric,
  findBaselineSecondary,
  computeConfidence,
  parseMetricLines,
  parseAsiLines,
  isBetter,
  formatNum,
  formatElapsed,
  pathMatchesSpec,
  normalizePathSpec,
  type ExperimentState,
  type ExperimentResult,
  type AutoresearchRuntime,
  type MetricDirection,
  type ExperimentStatus,
  type ASIData,
  type NumericMetricMap,
} from "../../../../../gajae-features/autoresearch/index"

const id = "autoresearch"

// Singleton runtime store — lives for the lifetime of the process.
const runtimeStore = createRuntimeStore()

// ─── Operation Schemas ────────────────────────────────────────────────────────

const initOperation = z.strictObject({
  action: z.literal("init"),
  metric_name: z.string().min(1).describe("Primary metric name (e.g., 'latency_ms')."),
  direction: z.enum(["lower", "higher"]).describe("Whether lower or higher values are better."),
  metric_unit: z.string().optional().describe("Unit suffix (e.g., 'ms', 'kb'). Auto-detected if omitted."),
  goal: z.string().optional().describe("Experiment goal description."),
  max_experiments: z.number().int().min(1).optional().describe("Maximum number of experiments to run."),
  scope_paths: z.array(z.string()).optional().describe("Paths that are in scope for modification."),
  off_limits: z.array(z.string()).optional().describe("Paths that must not be modified."),
  constraints: z.array(z.string()).optional().describe("Additional constraints."),
})

const recordOperation = z.strictObject({
  action: z.literal("record"),
  commit: z.string().min(1).describe("Git commit hash for this run."),
  metric: z.number().describe("Primary metric value."),
  metrics: z.record(z.number()).optional().describe("Additional metric values."),
  status: z.enum(["keep", "discard", "crash", "checks_failed"]).describe("Experiment status."),
  description: z.string().describe("Description of what changed."),
  modified_paths: z.array(z.string()).optional().describe("Paths modified in this run."),
  scope_deviations: z.array(z.string()).optional().describe("Paths that deviated from scope."),
  justification: z.string().optional().describe("Justification for the status."),
  asi: z.record(z.unknown()).optional().describe("Agent Structured Input data."),
})

const parseOutputOperation = z.strictObject({
  action: z.literal("parse_output"),
  output: z.string().describe("Command output to parse for METRIC and ASI lines."),
})

const statusOperation = z.strictObject({
  action: z.literal("status"),
})

const bestOperation = z.strictObject({
  action: z.literal("best"),
})

const confidenceOperation = z.strictObject({
  action: z.literal("confidence"),
})

const resetOperation = z.strictObject({
  action: z.literal("reset"),
})

const operationSchema = z.discriminatedUnion("action", [
  initOperation,
  recordOperation,
  parseOutputOperation,
  statusOperation,
  bestOperation,
  confidenceOperation,
  resetOperation,
])

// ─── Helper ───────────────────────────────────────────────────────────────────

function getRuntime(sessionID: string): AutoresearchRuntime {
  return runtimeStore.ensure(sessionID)
}

function formatResult(r: ExperimentResult, index: number): string {
  const status = r.flagged ? `${r.status} (flagged)` : r.status
  return [
    `  #${index + 1}: ${r.description}`,
    `    Metric: ${formatNum(r.metric, 2)} | Status: ${status} | Commit: ${r.commit.slice(0, 8)}`,
  ].join("\n")
}

// ─── Tool Definition ──────────────────────────────────────────────────────────

export const AutoresearchTool = Tool.define(
  id,
  Effect.succeed({
    description: [
      "Manage autoresearch experiments for automated benchmarking and optimization.",
      "",
      "Available actions:",
      "  init         — Initialize a new experiment with metric and direction",
      "  record       — Record an experiment result",
      "  parse_output — Parse command output for METRIC and ASI lines",
      "  status       — Show current experiment status and results",
      "  best         — Show the best result so far",
      "  confidence   — Compute statistical confidence",
      "  reset        — Reset experiment state",
    ].join("\n"),
    parameters: z.object({
      operation: operationSchema,
    }),
    execute: (args, ctx) =>
      Effect.gen(function* () {
        const op = args.operation
        const runtime = getRuntime(ctx.sessionID)
        let output: string

        switch (op.action) {
          case "init": {
            runtime.state = createExperimentState()
            runtime.state.metricName = op.metric_name
            runtime.state.bestDirection = op.direction
            runtime.state.metricUnit = op.metric_unit ?? ""
            runtime.state.goal = op.goal ?? null
            runtime.state.maxExperiments = op.max_experiments ?? null
            runtime.state.scopePaths = op.scope_paths ?? []
            runtime.state.offLimits = op.off_limits ?? []
            runtime.state.constraints = op.constraints ?? []
            runtime.autoresearchMode = true

            output = [
              `Experiment initialized:`,
              `  Metric: ${runtime.state.metricName} (${runtime.state.bestDirection} is better)`,
              `  Unit: ${runtime.state.metricUnit || "(auto)"}`,
              runtime.state.goal ? `  Goal: ${runtime.state.goal}` : null,
              runtime.state.maxExperiments ? `  Max experiments: ${runtime.state.maxExperiments}` : null,
              runtime.state.scopePaths.length > 0 ? `  Scope: ${runtime.state.scopePaths.join(", ")}` : null,
              runtime.state.offLimits.length > 0 ? `  Off-limits: ${runtime.state.offLimits.join(", ")}` : null,
            ].filter(Boolean).join("\n")
            break
          }

          case "record": {
            if (!runtime.autoresearchMode) {
              output = "Error: No experiment initialized. Use 'init' first."
              break
            }

            const result: ExperimentResult = {
              runNumber: runtime.state.results.length + 1,
              commit: op.commit,
              metric: op.metric,
              metrics: op.metrics ?? {},
              status: op.status,
              description: op.description,
              timestamp: Date.now(),
              segment: runtime.state.currentSegment,
              confidence: null,
              asi: op.asi as ASIData | undefined,
              modifiedPaths: op.modified_paths ?? [],
              scopeDeviations: op.scope_deviations ?? [],
              justification: op.justification ?? null,
              flagged: false,
              flaggedReason: null,
            }

            runtime.state.results.push(result)

            // Update best metric
            if (op.status === "keep") {
              const baseline = findBaselineMetric(runtime.state.results, runtime.state.currentSegment)
              if (baseline === null) {
                runtime.state.bestMetric = op.metric
              } else if (isBetter(op.metric, runtime.state.bestMetric ?? baseline, runtime.state.bestDirection)) {
                runtime.state.bestMetric = op.metric
              }
            }

            // Update confidence
            runtime.state.confidence = computeConfidence(
              runtime.state.results,
              runtime.state.currentSegment,
              runtime.state.bestDirection,
            )

            output = [
              `Result recorded: #${result.runNumber}`,
              `  Metric: ${formatNum(result.metric, 2)} | Status: ${result.status}`,
              `  Best: ${formatNum(runtime.state.bestMetric, 2)}`,
              runtime.state.confidence !== null ? `  Confidence: ${runtime.state.confidence.toFixed(2)}` : null,
            ].filter(Boolean).join("\n")
            break
          }

          case "parse_output": {
            const metrics = parseMetricLines(op.output)
            const asi = parseAsiLines(op.output)

            if (metrics.size === 0 && !asi) {
              output = "No METRIC or ASI lines found in output."
            } else {
              const lines: string[] = []
              if (metrics.size > 0) {
                lines.push("Parsed metrics:")
                for (const [name, value] of metrics) {
                  lines.push(`  ${name} = ${value}`)
                }
              }
              if (asi) {
                lines.push("Parsed ASI:")
                for (const [key, value] of Object.entries(asi)) {
                  lines.push(`  ${key} = ${JSON.stringify(value)}`)
                }
              }
              output = lines.join("\n")
            }
            break
          }

          case "status": {
            if (!runtime.autoresearchMode) {
              output = "No experiment active."
              break
            }

            const state = runtime.state
            const current = currentResults(state.results, state.currentSegment)
            const baseline = findBaselineResult(state.results, state.currentSegment)

            const lines = [
              `## Experiment Status`,
              ``,
              `Metric: ${state.metricName} (${state.bestDirection} is better)`,
              state.goal ? `Goal: ${state.goal}` : null,
              `Results: ${current.length} (${state.results.length} total)`,
              `Best: ${formatNum(state.bestMetric, 2)}`,
              baseline ? `Baseline: ${formatNum(baseline.metric, 2)}` : null,
              state.confidence !== null ? `Confidence: ${state.confidence.toFixed(2)}` : null,
              ``,
              `### Recent Results:`,
              ...current.slice(-5).map((r, i) => formatResult(r, current.length - 5 + i)),
            ].filter(Boolean)

            output = lines.join("\n")
            break
          }

          case "best": {
            if (!runtime.autoresearchMode) {
              output = "No experiment active."
              break
            }

            const best = findBestKeptMetric(
              runtime.state.results,
              runtime.state.currentSegment,
              runtime.state.bestDirection,
            )
            const baseline = findBaselineMetric(
              runtime.state.results,
              runtime.state.currentSegment,
            )
            const secondary = findBaselineSecondary(
              runtime.state.results,
              runtime.state.currentSegment,
              runtime.state.secondaryMetrics,
            )

            const lines = [
              `## Best Result`,
              ``,
              `Primary: ${formatNum(best, 2)}`,
              baseline !== null ? `Baseline: ${formatNum(baseline, 2)}` : null,
              best !== null && baseline !== null
                ? `Improvement: ${((1 - best / baseline) * 100).toFixed(1)}%`
                : null,
            ]

            if (Object.keys(secondary).length > 0) {
              lines.push(``, `Secondary metrics:`)
              for (const [name, value] of Object.entries(secondary)) {
                lines.push(`  ${name}: ${formatNum(value, 2)}`)
              }
            }

            output = lines.filter(Boolean).join("\n")
            break
          }

          case "confidence": {
            if (!runtime.autoresearchMode) {
              output = "No experiment active."
              break
            }

            const confidence = computeConfidence(
              runtime.state.results,
              runtime.state.currentSegment,
              runtime.state.bestDirection,
            )

            if (confidence === null) {
              output = "Insufficient data for confidence computation (need at least 3 unflagged results)."
            } else {
              output = [
                `## Confidence`,
                ``,
                `Score: ${confidence.toFixed(2)}`,
                confidence >= 2 ? `Status: High confidence` : confidence >= 1 ? `Status: Moderate confidence` : `Status: Low confidence`,
              ].join("\n")
            }
            break
          }

          case "reset": {
            runtimeStore.clear(ctx.sessionID)
            output = "Experiment state reset."
            break
          }
        }

        return {
          title: `autoresearch ${op.action}`,
          output,
          metadata: {},
        }
      }),
  }),
)
