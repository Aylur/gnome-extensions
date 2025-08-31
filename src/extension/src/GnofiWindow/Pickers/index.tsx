import St from "gi://St"
import Clutter from "gi://Clutter"
import DefaultPicker from "./DefaultPicker"
import HelpPicker from "./HelpPicker"
import Commands from "./Commands"

export default function Pickers() {
  return (
    <St.BoxLayout xExpand orientation={Clutter.Orientation.VERTICAL}>
      <HelpPicker />
      <DefaultPicker />
      <Commands />
    </St.BoxLayout>
  )
}
