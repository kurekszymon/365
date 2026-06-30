import { describe, expect, it } from "vitest"
import type { ModelMessage } from "ai"
import { trimHistory } from "@/lib/ai/trimHistory"

const user = (text: string): ModelMessage => ({ role: "user", content: text })
const assistant = (text: string): ModelMessage => ({
  role: "assistant",
  content: text,
})
const toolMsg = (): ModelMessage => ({
  role: "tool",
  content: [
    {
      type: "tool-result",
      toolCallId: "c1",
      toolName: "add_table",
      output: { type: "text", value: "ok" },
    },
  ],
})

describe("trimHistory", () => {
  it("returns history unchanged when within the cap", () => {
    const msgs = [user("a"), assistant("b")]
    expect(trimHistory(msgs, 10)).toBe(msgs)
  })

  it("keeps only the most recent messages when over the cap", () => {
    const msgs = [user("1"), assistant("2"), user("3"), assistant("4")]
    const out = trimHistory(msgs, 2)
    // tail would be [user("3"), assistant("4")] — already starts on a user msg
    expect(out).toEqual([user("3"), assistant("4")])
  })

  it("never starts the window on an orphaned assistant/tool message", () => {
    // raw tail of 2 would be [tool, user] — the tool result would be orphaned
    // from its assistant tool-call, so the cut advances to the next user msg.
    const msgs = [
      user("1"),
      assistant("2"),
      toolMsg(),
      user("3"),
      assistant("4"),
    ]
    const out = trimHistory(msgs, 3)
    expect(out[0]).toEqual(user("3"))
    expect(out).toHaveLength(2)
  })
})
