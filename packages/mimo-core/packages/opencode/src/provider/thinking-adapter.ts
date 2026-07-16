/**
 * Thinking Adapter for Orbit Code
 *
 * Bridges gajae-features/thinking module with MiMo's provider system.
 * Provides model-aware thinking level resolution and clamping.
 */

import {
  Effort,
  THINKING_EFFORTS,
  ThinkingLevel,
  type ThinkingCapableModel,
  clampThinkingLevelForModel,
  resolveThinkingLevelForModel,
  getSupportedEfforts,
  parseThinkingLevel,
  type ThinkingLevelValue,
  getThinkingLevelMetadata,
  type ThinkingLevelMetadata,
} from "../../../../../gajae-features/thinking/index"
import type { Provider } from "./provider"

// Re-export for convenience
export {
  Effort,
  THINKING_EFFORTS,
  ThinkingLevel,
  type ThinkingCapableModel,
  type ThinkingLevelValue,
  type ThinkingLevelMetadata,
}

// ─── MiMo Model Adapter ──────────────────────────────────────────────────────

/**
 * Convert MiMo's Provider.Model to gajae's ThinkingCapableModel interface.
 */
export function toThinkingCapableModel(model: Provider.Model): ThinkingCapableModel {
  return {
    reasoning: model.capabilities.reasoning ?? false,
    thinking: undefined, // Let getSupportedEfforts() use default THINKING_EFFORTS
  }
}

// ─── Resolution Helpers ──────────────────────────────────────────────────────

/**
 * Resolve a thinking level for a given model.
 * Returns the clamped effort level, or undefined if reasoning is not supported.
 */
export function resolveEffortForModel(
  model: Provider.Model,
  level: ThinkingLevel | undefined,
): Effort | undefined {
  const capable = toThinkingCapableModel(model)
  const resolved = resolveThinkingLevelForModel(capable, level)
  if (resolved === undefined || resolved === ThinkingLevel.Off) {
    return undefined
  }
  return resolved
}

/**
 * Get the supported effort levels for a model.
 */
export function getModelEfforts(model: Provider.Model): readonly Effort[] {
  const capable = toThinkingCapableModel(model)
  return getSupportedEfforts(capable)
}

/**
 * Check if a model supports reasoning.
 */
export function supportsReasoning(model: Provider.Model): boolean {
  return model.capabilities.reasoning ?? false
}

// ─── Metadata Helpers ────────────────────────────────────────────────────────

/**
 * Get display metadata for a thinking level.
 */
export function getLevelMetadata(level: ThinkingLevelValue): ThinkingLevelMetadata {
  return getThinkingLevelMetadata(level)
}

/**
 * Get all available thinking levels with metadata.
 */
export function getAllThinkingLevels(): ThinkingLevelMetadata[] {
  const levels: ThinkingLevelValue[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"]
  return levels.map(getThinkingLevelMetadata)
}
