/**
 * Safe wrapper for z.toJSONSchema that handles undefined schemas
 * and Zod v4 vs v3 version mismatch.
 */

import z from "zod"
// @ts-ignore - zod/v4 is available at runtime
import * as z4 from "zod/v4"

// Check if Zod v4's toJSONSchema is available
const z4ToJSONSchema = typeof z4?.toJSONSchema === "function" ? z4.toJSONSchema : undefined

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
  } catch (e) {
    // Log the error for debugging but return a minimal valid schema
    console.warn("safeToJSONSchema error:", e instanceof Error ? e.message : String(e))
    return { type: "object", properties: {} }
  }
}
