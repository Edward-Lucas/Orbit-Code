/**
 * Extended Thinking System for Orbit Code
 *
 * Ported from gajae-code, adapted for MiMo-Code's Effect-TS architecture.
 * Provides multi-level reasoning control (off → max) with model-aware clamping.
 */

// ─── Effort (Provider-facing reasoning levels) ───────────────────────────────

export enum Effort {
	Minimal = "minimal",
	Low = "low",
	Medium = "medium",
	High = "high",
	XHigh = "xhigh",
	Max = "max",
}

export const THINKING_EFFORTS: readonly Effort[] = [
	Effort.Minimal,
	Effort.Low,
	Effort.Medium,
	Effort.High,
	Effort.XHigh,
	Effort.Max,
]

// ─── ThinkingLevel (Agent-local selector) ────────────────────────────────────

export const ThinkingLevel = {
	Inherit: "inherit",
	Off: "off",
	...Effort,
} as const

export type ThinkingLevel = (typeof ThinkingLevel)[keyof typeof ThinkingLevel]
export type ResolvedThinkingLevel = Exclude<ThinkingLevel, "inherit">

const THINKING_LEVELS = new Set<string>([ThinkingLevel.Inherit, ThinkingLevel.Off, ...THINKING_EFFORTS])
const EFFORT_LEVELS = new Set<string>(THINKING_EFFORTS)

// ─── Metadata ────────────────────────────────────────────────────────────────

export type ThinkingLevelValue = "inherit" | "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max"

export interface ThinkingLevelMetadata {
	value: ThinkingLevelValue
	label: string
	description: string
}

const THINKING_LEVEL_METADATA: Record<ThinkingLevelValue, ThinkingLevelMetadata> = {
	inherit: { value: "inherit", label: "inherit", description: "Inherit session default" },
	off: { value: "off", label: "off", description: "No reasoning" },
	minimal: { value: "minimal", label: "min", description: "Very brief reasoning (~1k tokens)" },
	low: { value: "low", label: "low", description: "Light reasoning (~2k tokens)" },
	medium: { value: "medium", label: "medium", description: "Moderate reasoning (~8k tokens)" },
	high: { value: "high", label: "high", description: "Deep reasoning (~16k tokens)" },
	xhigh: { value: "xhigh", label: "xhigh", description: "Maximum reasoning (~32k tokens)" },
	max: { value: "max", label: "max", description: "Opus maximum reasoning" },
}

export function getThinkingLevelMetadata(level: ThinkingLevelValue): ThinkingLevelMetadata {
	return THINKING_LEVEL_METADATA[level]
}

// ─── Model capability interface ──────────────────────────────────────────────

/**
 * Minimal model capability interface for thinking level resolution.
 * MiMo's provider system can implement this to describe model thinking support.
 */
export interface ThinkingCapableModel {
	reasoning?: boolean
	thinking?: {
		efforts: readonly Effort[]
	}
}

// ─── Parsing functions ───────────────────────────────────────────────────────

export function parseEffort(value: string | null | undefined): Effort | undefined {
	if (value !== undefined && value !== null && EFFORT_LEVELS.has(value)) {
		return value as Effort
	}
	return undefined
}

export function parseThinkingLevel(value: string | null | undefined): ThinkingLevel | undefined {
	if (value !== undefined && value !== null && THINKING_LEVELS.has(value)) {
		return value as ThinkingLevel
	}
	return undefined
}

// ─── Conversion functions ────────────────────────────────────────────────────

export function toReasoningEffort(level: ThinkingLevel | undefined): Effort | undefined {
	if (level === undefined || level === ThinkingLevel.Off || level === ThinkingLevel.Inherit) {
		return undefined
	}
	return level as Effort
}

// ─── Model-aware resolution ──────────────────────────────────────────────────

export function getSupportedEfforts(model: ThinkingCapableModel | undefined): readonly Effort[] {
	if (!model?.reasoning) return []
	if (model.thinking?.efforts) return model.thinking.efforts
	return THINKING_EFFORTS
}

export function clampThinkingLevelForModel(
	model: ThinkingCapableModel | undefined,
	requested: Effort | undefined,
): Effort | undefined {
	if (!model || !model.reasoning || requested === undefined) {
		return undefined
	}

	const levels = getSupportedEfforts(model)
	if (levels.includes(requested)) {
		return requested
	}

	const requestedIndex = THINKING_EFFORTS.indexOf(requested)
	if (requestedIndex === -1) return undefined

	let clamped: Effort | undefined
	for (const effort of levels) {
		if (THINKING_EFFORTS.indexOf(effort) > requestedIndex) break
		clamped = effort
	}

	return clamped ?? levels[0]
}

export function resolveThinkingLevelForModel(
	model: ThinkingCapableModel | undefined,
	level: ThinkingLevel | undefined,
): ResolvedThinkingLevel | undefined {
	if (level === undefined || level === ThinkingLevel.Inherit) {
		return undefined
	}
	if (level === ThinkingLevel.Off) {
		return ThinkingLevel.Off
	}
	return clampThinkingLevelForModel(model, level)
}

export function clampExplicitThinkingLevelForModel(
	model: ThinkingCapableModel | undefined,
	level: ThinkingLevel | undefined,
): ThinkingLevel | undefined {
	if (level === undefined || level === ThinkingLevel.Inherit || level === ThinkingLevel.Off) {
		return level
	}
	return clampThinkingLevelForModel(model, level) as ThinkingLevel
}

export function formatClampedModelSelector(
	selector: string,
	model: ThinkingCapableModel | undefined,
): string {
	const slashIdx = selector.indexOf("/")
	if (slashIdx <= 0) return selector
	const id = selector.slice(slashIdx + 1)
	const colonIdx = id.lastIndexOf(":")
	if (colonIdx === -1) return selector
	const suffix = id.slice(colonIdx + 1)
	const thinkingLevel = parseThinkingLevel(suffix)
	if (!thinkingLevel) return selector
	const clamped = clampExplicitThinkingLevelForModel(model, thinkingLevel)
	return clamped && clamped !== ThinkingLevel.Inherit
		? `${selector.slice(0, slashIdx + 1)}${id.slice(0, colonIdx)}:${clamped}`
		: `${selector.slice(0, slashIdx + 1)}${id.slice(0, colonIdx)}`
}
