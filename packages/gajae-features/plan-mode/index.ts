/**
 * Plan Mode State for Orbit Code
 *
 * Manages plan mode state for structured planning workflows.
 * Ported from gajae-code plan-mode/state.ts,
 * adapted for Orbit Code.
 */

export interface PlanModeState {
	enabled: boolean
	planFilePath: string
	workflow?: "parallel" | "iterative"
	reentry?: boolean
}

export interface ApprovedPlan {
	title: string
	fileName: string
	planFilePath: string
	finalPlanFilePath: string
	planExists: boolean
	createdAt: string
	updatedAt: string
}

/**
 * Validate and normalize a plan title into a safe filename stem.
 */
export function normalizePlanTitle(title: string): { title: string; fileName: string } {
	const trimmed = title.trim()
	if (!trimmed) {
		throw new Error("Plan title is required and must not be empty.")
	}
	if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
		throw new Error("Plan title must not contain path separators or '..'.")
	}
	const withoutExt = trimmed.replace(/\.md$/i, "")
	const sanitized = withoutExt
		.replace(/\s+/g, "-")
		.replace(/[^A-Za-z0-9_-]/g, "")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "")
	if (!sanitized) {
		throw new Error("Plan title must contain at least one letter, number, underscore, or hyphen.")
	}
	return { title: sanitized, fileName: `${sanitized}.md` }
}

/**
 * Resolve plan title from various input sources.
 */
export function resolvePlanTitle(input: {
	suppliedTitle?: unknown
	planContent: string
	planFilePath: string
}): { title: string; fileName: string; source: "supplied" | "heading" | "filename" | "default" } {
	const candidates: Array<{ value: string; source: "supplied" | "heading" | "filename" | "default" }> = []

	if (typeof input.suppliedTitle === "string" && input.suppliedTitle.trim()) {
		candidates.push({ value: input.suppliedTitle.trim(), source: "supplied" })
	}

	const headingMatch = input.planContent.match(/^[ \t]*#[ \t]+(.+?)[ \t]*$/m)
	if (headingMatch?.[1]?.trim()) {
		candidates.push({ value: headingMatch[1].trim(), source: "heading" })
	}

	const stem = input.planFilePath.replace(/^local:\/+/, "").split(/[\\/]/).pop()?.replace(/\.md$/i, "") ?? ""
	if (stem) {
		candidates.push({ value: stem, source: "filename" })
	}

	candidates.push({ value: "plan", source: "default" })

	for (const candidate of candidates) {
		try {
			const normalized = normalizePlanTitle(candidate.value)
			return { ...normalized, source: candidate.source }
		} catch {
			// Fall through
		}
	}
	return { title: "plan", fileName: "plan.md", source: "default" }
}

/**
 * Humanize a plan title for display.
 */
export function humanizePlanTitle(title: string): string {
	const spaced = title.replace(/[-_]+/g, " ").trim()
	if (!spaced) return ""
	return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
