/**
 * Safe wrapper for z.toJSONSchema that handles undefined schemas
 * and Zod v4 vs v3 version mismatch.
 */

import z from "zod"

// Import Zod v4's toJSONSchema statically
let z4ToJSONSchema: ((schema: unknown, options?: unknown) => unknown) | undefined
try {
  // @ts-ignore - zod/v4 is available at runtime
  const z4 = await import("zod/v4")
  if (z4 && typeof z4.toJSONSchema === "function") {
    z4ToJSONSchema = z4.toJSONSchema
  }
} catch {
  // Zod v4 not available, will use v3
}

// Use Bun's top-level await to wait for the import
// Fallback: check if global zod v4 is available
if (!z4ToJSONSchema) {
  try {
    // @ts-ignore
    const z4 = globalThis.__zod_v4 || (await import("zod/v4").catch(() => null))
    if (z4?.toJSONSchema) z4ToJSONSchema = z4.toJSONSchema
  } catch {}
}

export function safeToJSONSchema(schema: unknown, options?: Parameters<typeof z.toJSONSchema>[1]): ReturnType<typeof z.toJSONSchema> {
  if (!schema) {
    return {}
  }

  // Check if this is a Zod v4 schema (has _zod property with version info)
  const schemaObj = schema as Record<string, unknown>
  const zodInfo = schemaObj?._zod as Record<string, unknown> | undefined
  const isV4Schema = zodInfo?.version !== undefined && (zodInfo.version as Record<string, unknown>)?.major === 4

  try {
    if (isV4Schema && z4ToJSONSchema) {
      // Use Zod v4's toJSONSchema for v4 schemas
      return z4ToJSONSchema(schema, options) as ReturnType<typeof z.toJSONSchema>
    }
    // Fall back to Zod v3's toJSONSchema
    return z.toJSONSchema(schema as Parameters<typeof z.toJSONSchema>[0], options)
  } catch {
    // Silently return empty object on error
    return {}
  }
}
