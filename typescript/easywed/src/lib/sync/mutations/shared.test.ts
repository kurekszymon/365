// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { run } from "./shared"
import { LOCAL_WEDDING_ID } from "@/lib/localWedding"
import { useGlobalStore } from "@/stores/global.store"

describe("run", () => {
  afterEach(() => {
    useGlobalStore.setState({ weddingId: undefined })
  })

  it("resolves true and never invokes the query for a local wedding", async () => {
    useGlobalStore.setState({ weddingId: LOCAL_WEDDING_ID })

    let invoked = false
    const query = {
      then: () => {
        invoked = true
        throw new Error("should not be awaited for a local wedding")
      },
    }

    await expect(run("test", query)).resolves.toBe(true)
    expect(invoked).toBe(false)
  })

  it("awaits and resolves per the query result for a cloud wedding", async () => {
    useGlobalStore.setState({ weddingId: "cloud-uuid" })

    await expect(run("test", Promise.resolve({ error: null }))).resolves.toBe(
      true
    )
    await expect(
      run("test", Promise.resolve({ error: new Error("boom") }))
    ).resolves.toBe(false)
  })
})
