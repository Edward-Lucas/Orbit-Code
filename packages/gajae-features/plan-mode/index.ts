/**
 * Plan Mode State for Orbit Code
 *
 * Manages plan mode state for structured planning workflows.
 * Ported from gajae-code plan-mode/approved-plan.ts + state.ts,
 * adapted for Orbit Code. No external dependencies.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

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

// ─── Plan Approval ──────────────────────────────────────────────────────────

/**
 * Shape forwarded from the plan-mode resolve handler to the approval popup.
 * Ported from gajae-code plan-mode/approved-plan.ts.
 */
export interface PlanApprovalDetails {
	planFilePath: string
	finalPlanFilePath: string
	title: string
	planExists: boolean
}

interface RenameApprovedPlanFileOptions {
	planFilePath: string
	finalPlanFilePath: string
	getArtifactsDir: () => string | null
	getSessionId: () => string | null
}

function assertLocalUrl(urlPath: string, label: "source" | "destination"): void {
	if (!urlPath.startsWith("local:/") && !urlPath.startsWith("local://")) {
		throw new Error(`Approved plan ${label} path must use local: scheme (received ${urlPath}).`)
	}
}

/**
 * Rename an approved plan file from its working path to its final path.
 * Ported from gajae-code plan-mode/approved-plan.ts.
 */
export async function renameApprovedPlanFile(options: RenameApprovedPlanFileOptions): Promise<void> {
	const { planFilePath, finalPlanFilePath, getArtifactsDir, getSessionId } = options
	assertLocalUrl(planFilePath, "source")
	assertLocalUrl(finalPlanFilePath, "destination")

	const artifactsDir = getArtifactsDir()
	const sessionId = getSessionId()
	if (!artifactsDir || !sessionId) {
		throw new Error("Artifacts directory and session ID are required for plan file rename.")
	}

	const resolvedSource = path.join(artifactsDir, sessionId, planFilePath.replace(/^local:\/+/", ""))
	const resolvedDestination = path.join(artifactsDir, sessionId, finalPlanFilePath.replace(/^local:\/+/", ""))

	if (resolvedSource === resolvedDestination) return

	try {
		const destinationStat = await fs.stat(resolvedDestination)
		if (destinationStat.isFile()) {
			throw new Error(
				`Plan destination already exists at ${finalPlanFilePath}. Choose a different title.`,
			)
		}
		throw new Error(`Plan destination exists but is not a file: ${finalPlanFilePath}`)
	} catch (error: unknown) {
		if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error
		}
	}

	try {
		await fs.rename(resolvedSource, resolvedDestination)
	} catch (error) {
		throw new Error(
			`Failed to rename approved plan from ${planFilePath} to ${finalPlanFilePath}: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}
