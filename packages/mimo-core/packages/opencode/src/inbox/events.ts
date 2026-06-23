/**
 * Inbox Events for Orbit Code
 *
 * Replaces @/actor/events dependency with standalone event definitions.
 */

import { Bus } from "@/bus"
import type { SessionID } from "@/session/schema"

export const InboxArrived = Bus.event<{
  receiverSessionID: SessionID
  receiverActorID: string
  senderSessionID?: SessionID
  senderActorID?: string
  inboxID: string
  type: string
}>("InboxArrived")
