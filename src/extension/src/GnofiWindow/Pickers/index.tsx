import St from "gi://St"
import DefaultPicker from "./DefaultPicker"
import HelpPicker from "./HelpPicker"
import Commands from "./Commands"

export default function Pickers() {
  return (
    <St.BoxLayout xExpand vertical>
      <HelpPicker />
      <DefaultPicker />
      <Commands />
    </St.BoxLayout>
  )
}
