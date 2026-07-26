/**
 * Inbox Events for Orbit Code
 *
 * Replaces @/actor/events dependency with standalone event definitions.
 */

import z from "zod"
import { BusEvent } from "@/bus/bus-event"
import { SessionID } from "@/session/schema"

export const InboxArrived = BusEvent.define(
  "inbox.arrived",
  z.object({
    receiverSessionID: SessionID.zod,
    receiverActorID: z.string(),
    senderSessionID: SessionID.zod.optional(),
    senderActorID: z.string().optional(),
    inboxID: z.string(),
    type: z.string(),
  }),
)
