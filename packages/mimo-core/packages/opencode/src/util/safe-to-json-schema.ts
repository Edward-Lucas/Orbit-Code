/**
 * Safe wrapper for z.toJSONSchema that handles undefined schemas
 * and validates schema structure before conversion.
 */

import z from "zod"

/**
 * Recursively checks if a schema has all required _zod properties.
 * Returns false if any nested schema is missing _zod.
 */
function isValidSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return true

  const s = schema as Record<string, unknown>

  // If it has _zod, check its structure
  if (s._zod) {
    const zodInfo = s._zod as Record<string, unknown>
    if (!zodInfo.def) return false

    // Check nested schemas in def.shape (for objects)
    const def = zodInfo.def as Record<string, unknown>
    if (def.shape && typeof def.shape === "object") {
      const shape = def.shape as Record<string, unknown>
      for (const key of Object.keys(shape)) {
        if (!isValidSchema(shape[key])) return false
      }
    }

    // Check nested schemas in def.in and def.out (for pipes)
    if (def.in && !isValidSchema(def.in)) return false
    if (def.out && !isValidSchema(def.out)) return false
  }

  return true
}

export function safeToJSONSchema(schema: unknown, options?: Parameters<typeof z.toJSONSchema>[1]): ReturnType<typeof z.toJSONSchema> {
  if (!schema) {
    return { type: "object", properties: {} }
  }

  // Validate schema structure before conversion
  if (!isValidSchema(schema)) {
    return { type: "object", properties: {} }
  }

  try {
    return z.toJSONSchema(schema as Parameters<typeof z.toJSONSchema>[0], options)
  } catch {
    return { type: "object", properties: {} }
  }
}
