// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { run } from "./shared"
import { LOCAL_WEDDING_ID } from "@/lib/localWedding"
import { useGlobalStore } from "@/stores/global.store"

describe("run", () => {
  afterEach(() => {
    useGlobalStore.setState({ weddingId: undefined })
    // useGlobalStore is a persisted store - setting weddingId to the local
    // sentinel above triggers the gated storage to actually write to
    // localStorage (see localWedding.ts's createLocalGatedStorage). Clear it
    // so that write doesn't leak into other test files sharing this worker.
    localStorage.clear()
  })

  it("resolves true and never invokes the query for a local wedding", async () => {
    useGlobalStore.setState({ weddingId: LOCAL_WEDDING_ID })

    let invoked = false
    // A spec-compliant thenable (accepts the resolve/reject callbacks and
    // returns a real promise) rather than a stub `then` that ignores its
    // arguments - so this test would still fail correctly (a rejected
    // promise) instead of relying on a synchronous throw if the local-gate
    // check in run() were ever accidentally removed.
    const query: PromiseLike<{ error: unknown }> = {
      then: (onfulfilled, onrejected) => {
        invoked = true
        return Promise.reject(
          new Error("should not be awaited for a local wedding")
        ).then(onfulfilled, onrejected)
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
