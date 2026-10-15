import { useTranslation } from "react-i18next"
import { CheckIcon, XIcon } from "lucide-react"
import { PanelBody } from "./PanelBody"
import { usePanelTitle } from "./usePanelTitle"
import { useVisiblePanelView } from "./useVisiblePanelView"
import { usePanelStore } from "@/stores/panel.store"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

// Android's on-screen keyboard covers the lower half of the drawer, hiding
// whatever field you just tapped. The keyboard shrinks the visual viewport as
// it slides in, firing `resize` through the animation, so the field is
// scrolled into view once those stop for a beat - right when the keyboard has
// settled, however fast or slow the device. This replaced a fixed 300ms wait,
// which was late on slow phones and needlessly slow on fast ones.
const KEYBOARD_SETTLE_MS = 100
// No resize at all - a hardware keyboard, or a field that needs none.
const NO_KEYBOARD_MS = 500
// visualViewport this much shorter than the window = the keyboard is already
// up (moving between fields), so there's nothing to wait for.
const KEYBOARD_OPEN_PX = 150

const scrollIntoViewOnceKeyboardSettles = (target: Element) => {
  const scroll = () =>
    target.scrollIntoView({ block: "center", behavior: "smooth" })
  const viewport = window.visualViewport
  if (!viewport) {
    window.setTimeout(scroll, 300)
    return
  }
  if (window.innerHeight - viewport.height > KEYBOARD_OPEN_PX) {
    scroll()
    return
  }

  let timer = 0
  const stop = () => {
    window.clearTimeout(timer)
    viewport.removeEventListener("resize", onResize)
    target.removeEventListener("blur", stop)
  }
  const settle = () => {
    stop()
    scroll()
  }
  const onResize = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(settle, KEYBOARD_SETTLE_MS)
  }
  viewport.addEventListener("resize", onResize)
  // Focus moving on before the keyboard settles - the next field takes over.
  target.addEventListener("blur", stop)
  timer = window.setTimeout(settle, NO_KEYBOARD_MS)
}

/**
 * Mobile-only bottom drawer for the panel views (table/fixture/hall forms,
 * the add hub, the AI chat). On desktop the same views render in
 * `Sidebar/EntityEditDialog` / `Sidebar/SidebarRail` instead - this component
 * is only mounted below the `md` breakpoint (see `Planner.tsx`).
 */
export const MobilePanelDrawer = () => {
  const { t } = useTranslation()
  // Not the raw store view: one a viewer may not see resolves to null here, so
  // the drawer stays shut instead of opening its chrome around nothing.
  const view = useVisiblePanelView()
  const close = usePanelStore((state) => state.close)
  const title = usePanelTitle(view)

  // Shape editing is a canvas-only mode - the drawer stays closed so the
  // vertex handles are reachable.
  const isOpen = view !== null && view.kind !== "shape.edit"
  // The AI chat owns its own vertical layout (scrolling transcript + pinned
  // composer) and wants more room, so it opts out of the default padded,
  // auto-scrolling content wrapper.
  const isChat = view?.kind === "ai_chat"
  // Form/edit views (table/fixture/hall/batch) apply their changes live, so
  // dismissing them is really a "done" confirmation - show a checkmark instead
  // of an X. The add hub and AI chat are pickers/conversations, not forms, so
  // they keep the neutral close affordance.
  const isFormView =
    view !== null &&
    view.kind !== "add_hub" &&
    view.kind !== "ai_chat" &&
    view.kind !== "shape.edit"
  const body = view ? <PanelBody view={view} /> : null

  const scrollFocusedIntoView = (e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target
    if (!target.matches("input, textarea, select, [contenteditable='true']"))
      return
    scrollIntoViewOnceKeyboardSettles(target)
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="flex flex-row items-center justify-between">
          <DrawerTitle className="font-heading text-xl leading-tight font-semibold">
            {title}
          </DrawerTitle>
          {isFormView ? (
            <button
              type="button"
              onClick={close}
              className="flex size-9 pressable items-center justify-center rounded-full bg-primary text-primary-foreground active:bg-primary/85"
              aria-label={t("common.done")}
            >
              <CheckIcon className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="-m-1 pressable rounded-full p-1 text-muted-foreground hover:text-foreground active:bg-muted active:text-foreground"
              aria-label={t("common.close")}
            >
              <XIcon className="size-5" />
            </button>
          )}
        </DrawerHeader>
        {isChat ? (
          <div className="flex h-[70vh] flex-col pb-[env(safe-area-inset-bottom)]">
            {body}
          </div>
        ) : (
          <div
            onFocus={scrollFocusedIntoView}
            className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {body}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
