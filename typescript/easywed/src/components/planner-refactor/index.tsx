import { Canvas } from "./Canvas"
import { Header } from "./Header"

const Planner = () => {
  // TODO: handle initial entry -> set wedding name and date
  return (
    <div className="h-screen w-screen">
      <Header />
      <Canvas />
    </div>
  )
}

export default Planner
