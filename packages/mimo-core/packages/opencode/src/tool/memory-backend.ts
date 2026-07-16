import { Effect } from "effect"
import z from "zod"
import { Memory } from "@/memory"
import * as Tool from "./tool"

const id = "memory_backend"

const statusOperation = z.strictObject({
  action: z.literal("status"),
})

const enqueueOperation = z.strictObject({
  action: z.literal("enqueue"),
})

const clearOperation = z.strictObject({
  action: z.literal("clear"),
})

const operationSchema = z.discriminatedUnion("action", [
  statusOperation,
  enqueueOperation,
  clearOperation,
])

export const MemoryBackendTool = Tool.define(
  id,
  Effect.gen(function* () {
    const memory = yield* Memory.Service

    return {
      description: [
        "Manage the memory backend system.",
        "",
        "Available actions:",
        "  status  — Show current memory backend status, configuration, and index stats",
        "  enqueue — Force memory reconciliation (index new/changed files immediately)",
        "  clear   — Clear memory backend state (FTS index will rebuild on next use)",
      ].join("\n"),
      parameters: z.object({
        operation: operationSchema,
      }),
      execute: (args: z.infer<typeof parameters>) =>
        Effect.gen(function* () {
          const op = args.operation
          let output: string

          switch (op.action) {
            case "status": {
              const backend = yield* memory.backend()
              const root = yield* memory.root()

              const lines = [
                `## Memory Backend Status`,
                ``,
                `- Backend: ${backend.id}`,
                `- Root: ${root}`,
              ]

              // Try to get index stats by doing a test search
              try {
                const testResults = yield* memory.search({ query: "memory", limit: 1 })
                lines.push(`- FTS Index: ${testResults.length > 0 ? "active" : "empty or not initialized"}`)
              } catch {
                lines.push(`- FTS Index: error checking`)
              }

              output = lines.join("\n")
              break
            }

            case "enqueue": {
              output = `Memory reconciliation triggered.`
              try {
                yield* memory.startBackend({
                  sessionID: "manual-enqueue",
                  cwd: process.cwd(),
                  agentDir: process.cwd(),
                  taskDepth: 0,
                })
                output += `\nBackend started successfully.`
              } catch (err) {
                output += `\nNote: ${String(err)}`
              }

              // Force reconcile
              try {
                const result = yield* memory.reconcile()
                output += `\n\nReconcile complete:`
                output += `\n- Indexed: ${result.indexed} files`
                output += `\n- Pruned: ${result.pruned} files`
              } catch (err) {
                output += `\nReconcile failed: ${String(err)}`
              }
              break
            }

            case "clear": {
              const backend = yield* memory.backend()
              try {
                yield* Effect.promise(() => backend.clear(process.cwd(), process.cwd()))
                output = [
                  `Memory backend state cleared.`,
                  ``,
                  `Note: FTS index will be rebuilt on next search or reconcile.`,
                ].join("\n")
              } catch (err) {
                output = `Clear failed: ${String(err)}`
              }
              break
            }
          }

          return {
            title: `memory_backend ${op.action}`,
            output,
            metadata: {},
          }
        }),
    }
  }),
)
