import * as React from "react"
import { useTranslation } from "react-i18next"
import { XIcon } from "lucide-react"

import { useIsMobile } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

// A dialog that renders as a centered dialog on desktop and a native-feeling
// bottom-sheet drawer on phones. The active mode is decided once per open
// dialog and shared via context so every subcomponent agrees. The subcomponent
// surface mirrors the plain Dialog API so callers only swap imports + tag names.
const ResponsiveDialogContext = React.createContext(false)
const useIsDrawer = () => React.useContext(ResponsiveDialogContext)

type ResponsiveDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Forwarded to the mobile drawer to block swipe/overlay/escape dismissal
  // (e.g. while a destructive commit is in flight). Ignored on desktop.
  dismissible?: boolean
  children?: React.ReactNode
}

function ResponsiveDialog({ dismissible, ...props }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  return (
    <ResponsiveDialogContext.Provider value={isMobile}>
      {isMobile ? (
        <Drawer dismissible={dismissible} {...props} />
      ) : (
        <Dialog {...props} />
      )}
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isDrawer = useIsDrawer()
  if (isDrawer) {
    return (
      <DrawerContent className={className} {...props}>
        {children}
      </DrawerContent>
    )
  }
  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  )
}

// On mobile the header is pinned at the top of the sheet and grows a close
// button, matching the planner's PropertyPanel drawer.
function ResponsiveDialogHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const isDrawer = useIsDrawer()
  const { t } = useTranslation()
  if (isDrawer) {
    return (
      <DrawerHeader
        className={cn(
          "flex shrink-0 flex-row items-center justify-between",
          className
        )}
        {...props}
      >
        {children}
        <DrawerClose
          className="rounded-sm text-muted-foreground hover:text-foreground"
          aria-label={t("common.close")}
        >
          <XIcon className="size-5" />
        </DrawerClose>
      </DrawerHeader>
    )
  }
  return (
    <DialogHeader className={className} {...props}>
      {children}
    </DialogHeader>
  )
}

// The scrollable body. On desktop it is transparent (DialogContent already
// scrolls and lays out its children in a gap-4 grid); on mobile it becomes the
// scroll container under the pinned header.
function ResponsiveDialogBody({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const isDrawer = useIsDrawer()
  if (isDrawer) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          className
        )}
      >
        {children}
      </div>
    )
  }
  return <>{children}</>
}

function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>
) {
  const isDrawer = useIsDrawer()
  return isDrawer ? <DrawerTitle {...props} /> : <DialogTitle {...props} />
}

function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>
) {
  const isDrawer = useIsDrawer()
  return isDrawer ? (
    <DrawerDescription {...props} />
  ) : (
    <DialogDescription {...props} />
  )
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isDrawer = useIsDrawer()
  return isDrawer ? (
    <DrawerFooter className={className} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  )
}

function ResponsiveDialogClose(
  props: React.ComponentProps<typeof DialogClose>
) {
  const isDrawer = useIsDrawer()
  return isDrawer ? <DrawerClose {...props} /> : <DialogClose {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
}
