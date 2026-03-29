import { useEffect } from "react"
import { DialogManager } from "../dialogs/DialogManager"
import { Canvas } from "./Canvas"
import { Header } from "./Header"
import { useDialogStore } from "@/stores/dialog.store"
import { useGlobalStore } from "@/stores/global.store"

const Planner = () => {
  const name = useGlobalStore((state) => state.name)
  const openDialog = useDialogStore((state) => state.open)

  useEffect(() => {
    if (!name) {
      openDialog("Wedding.Create")
    }
  }, [openDialog, name])

  return (
    <>
      <DialogManager />

      <div className="h-screen w-screen">
        <Header />
        <Canvas />
      </div>
    </>
  )
}

export default Planner
