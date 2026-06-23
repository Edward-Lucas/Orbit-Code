/**
 * Autoresearch System for Orbit Code
 *
 * Stub module — full implementation deferred to Phase 3.
 * Provides type definitions for the autoresearch experimental optimization loop.
 *
 * Ported from gajae-code coding-agent/src/autoresearch/.
 */

export interface AutoresearchRuntime {
  autoresearchMode: boolean;
  autoResumeArmed: boolean;
  goal: string | null;
  state: ExperimentState;
  runningExperiment: string | null;
  dashboardExpanded: boolean;
  lastRunSummary: PendingRunSummary | null;
  lastRunDuration: number | null;
  lastRunAsi: string | null;
  lastRunArtifactDir: string | null;
  lastRunNumber: number | null;
  lastAutoResumePendingRunNumber: number | null;
}

export interface ExperimentState {
  name: string | null;
  goal: string | null;
  metricUnit: string;
  bestDirection: "higher" | "lower";
  currentSegment: number;
  results: ExperimentResult[];
}

export interface ExperimentResult {
  runNumber?: number;
  description: string;
  metric: number;
  status: "keep" | "discard";
  flagged: boolean;
  flaggedReason?: string;
  scopeDeviations: string[];
  justification?: string;
}

export interface PendingRunSummary {
  runNumber: number;
  durationSeconds: number | null;
  parsedAsi: string | null;
  runDirectory: string | null;
}
