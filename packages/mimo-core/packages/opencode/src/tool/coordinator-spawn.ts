/**
 * Coordinator Spawn Adapter
 *
 * Bridges the Coordinator system with MiMo's session/agent spawning.
 * Provides actual sub-agent execution for delegate operations.
 */

import { Effect } from "effect"
import { Session } from "@/session"
import { SessionPrompt } from "@/session/prompt"
import { Agent } from "@/agent/agent"
import { Provider } from "@/provider"
import { MessageV2 } from "@/session/message-v2"
import { type SessionID, MessageID, PartID } from "@/session/schema"
import { Log } from "@/util"
import { CoordinatorStateStore } from "../../../../../gajae-features/coordinator-mcp/server"

const log = Log.create({ service: "coordinator-spawn" })

export interface DelegateResult {
  sessionId: string
  turnId: string
  status: "queued" | "completed" | "failed"
  result?: string
  error?: string
}

/**
 * Execute a delegated task by spawning a real MiMo sub-agent.
 *
 * This function:
 * 1. Creates a new child session
 * 2. Sends the task as a user message
 * 3. Executes the prompt using SessionPrompt
 * 4. Returns the result to be stored in the Coordinator turn
 */
export function executeDelegatedTask(
  store: CoordinatorStateStore,
  input: {
    sessionId: string
    turnId: string
    task: string
    cwd: string
    agentType?: string
  },
): Effect.Effect<DelegateResult> {
  return Effect.gen(function* () {
    const session = yield* Session.Service
    const prompt = yield* SessionPrompt.Service
    const agentService = yield* Agent.Service
    const provider = yield* Provider.Service

    try {
      // Get the agent configuration
      const agentName = input.agentType ?? "general"
      const agentInfo = yield* agentService.get(agentName).pipe(
        Effect.catch(() => agentService.get("general")),
      )

      // Get the default model
      const model = yield* provider.defaultModel()

      // Create a child session for this delegation
      const childSession = yield* session.create({
        title: `Coordinator delegation: ${input.task.slice(0, 50)}...`,
      })

      log.info("created child session for delegation", {
        childSessionId: childSession.id,
        coordinatorSessionId: input.sessionId,
        turnId: input.turnId,
      })

      // Update the turn status to active
      store.updateTurnStatus(input.turnId, "active")

      // Create the user message with the task
      const userMsg: MessageV2.User = {
        id: MessageID.ascending(),
        sessionID: childSession.id,
        role: "user",
        time: { created: Date.now() },
        agent: agentName,
        model: { providerID: model.providerID, modelID: model.id },
      }
      yield* session.updateMessage(userMsg)
      yield* session.updatePart({
        id: PartID.ascending(),
        messageID: userMsg.id,
        sessionID: childSession.id,
        type: "text",
        text: input.task,
        synthetic: false,
      })

      // Execute the prompt - this runs the agent loop
      const result = yield* prompt.prompt({
        sessionID: childSession.id,
        parts: [{ type: "text", text: input.task }],
        agent: agentName,
      }).pipe(
        Effect.timeout("5m"),
        Effect.catch((error) => {
          log.error("delegation execution failed", { error: String(error) })
          return Effect.succeed(null)
        }),
      )

      if (result) {
        // Extract the assistant's response text
        const assistantText = extractAssistantText(result)

        // Complete the turn with the result
        store.completeTurn({
          turnId: input.turnId,
          text: assistantText,
        })

        return {
          sessionId: input.sessionId,
          turnId: input.turnId,
          status: "completed",
          result: assistantText,
        }
      } else {
        // Execution failed
        store.failTurn({
          turnId: input.turnId,
          code: "EXECUTION_FAILED",
          message: "Sub-agent execution failed or timed out",
        })

        return {
          sessionId: input.sessionId,
          turnId: input.turnId,
          status: "failed",
          error: "Sub-agent execution failed or timed out",
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error("delegation error", { error: errorMessage })

      store.failTurn({
        turnId: input.turnId,
        code: "DELEGATION_ERROR",
        message: errorMessage,
      })

      return {
        sessionId: input.sessionId,
        turnId: input.turnId,
        status: "failed",
        error: errorMessage,
      }
    }
  })
}

/**
 * Extract assistant text from a message result.
 */
function extractAssistantText(msg: MessageV2.WithParts): string {
  const textParts = msg.parts.filter(
    (p): p is MessageV2.TextPart => p.type === "text" && !p.synthetic,
  )
  return textParts.map((p) => p.text).join("\n\n")
}
