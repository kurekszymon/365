import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { EditorPage } from '#/components/editor/EditorPage'
import { decodeDesign, encodeDesign } from '#/lib/invitation/hash'
import { useDesignStore } from '#/stores/design.store'
import type { Design } from '#/lib/invitation/types'
// Side-effect: load fonts
import '#/lib/invitation/fonts'

export const Route = createFileRoute('/editor')({
  component: EditorRoute,
})

function EditorRoute() {
  const setDesign = useDesignStore((s) => s.setDesign)
  // Select each primitive separately so Zustand's Object.is comparison works
  // correctly — never create a new object in the selector (causes infinite loops).
  const design = useDesignStore((s) => s.design)
  const includeGuestsInHash = useDesignStore((s) => s.includeGuestsInHash)
  const guests = useDesignStore((s) => s.guests)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasHydratedRef = useRef(false)

  // On first run: decode the URL hash and populate the store, then return early
  // so we never overwrite the incoming hash with the blank default design.
  // On subsequent runs: debounce-sync the design back to the hash.
  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true
      const hash = window.location.hash
      if (hash && hash.length > 1) {
        const decoded = decodeDesign(hash.slice(1))
        if (decoded) {
          setDesign(decoded)
          return
        }
      }
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const toEncode: Design =
        includeGuestsInHash && guests.length > 0
          ? { ...design, guests }
          : design
      const newHash = '#' + encodeDesign(toEncode)
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [design, includeGuestsInHash, guests, setDesign])

  return <EditorPage />
}
