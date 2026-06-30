import type { ModelMessage } from "ai"

// The store keeps the full conversation, but every turn also re-embeds a full
// layout snapshot in the system prompt, so the model payload would grow without
// bound. Cap how much history we actually send.
export const MAX_HISTORY_MESSAGES = 24

// Returns the most recent `max` messages, but never starts the window on an
// orphaned assistant/tool message: a tool result must stay paired with the
// assistant tool-call that produced it, so we advance the cut forward to the
// next `user` message. The full history is untouched — only the sent slice is.
export const trimHistory = (
  messages: Array<ModelMessage>,
  max: number = MAX_HISTORY_MESSAGES
): Array<ModelMessage> => {
  if (messages.length <= max) return messages

  let start = messages.length - max
  while (start < messages.length && messages[start].role !== "user") start++

  // Guard: if no user message exists in the tail (shouldn't happen — turns start
  // with one), fall back to the raw tail rather than dropping everything.
  if (start === messages.length) return messages.slice(messages.length - max)

  return messages.slice(start)
}
