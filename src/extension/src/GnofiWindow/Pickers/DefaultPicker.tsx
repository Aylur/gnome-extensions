import St from "gi://St"
import Clutter from "gi://Clutter"
import { useGnofi } from "#/Gnofi"
import { createBinding, For } from "gnim"
import { useSettings } from "~schemas"
import Picker from "./Picker"
import Separator from "#/widgets/Separator"

export default function DefaultPicker() {
  const { gnofi } = useGnofi()
  const { searchPickers } = useSettings()

  const activePicker = createBinding(gnofi, "activePicker")
  const isActive = activePicker((a) => a === gnofi.builtinDefaultPicker)
  const pickers = createBinding(gnofi.builtinDefaultPicker, "pickers")
  const hasResult = createBinding(gnofi.builtinDefaultPicker, "hasResult")

  return (
    <St.BoxLayout xExpand visible={isActive} orientation={Clutter.Orientation.VERTICAL}>
      <St.BoxLayout
        xExpand
        visible={hasResult((x) => !x)}
        orientation={Clutter.Orientation.VERTICAL}
      >
        <Separator />
        <St.Label
          xExpand
          xAlign={Clutter.ActorAlign.CENTER}
          class="gnofi-no-match-label"
          text={_("No match found")}
        />
      </St.BoxLayout>
      <St.BoxLayout
        xExpand
        visible={hasResult}
        orientation={Clutter.Orientation.VERTICAL}
      >
        <For each={pickers}>
          {(picker) => (
            <Picker
              schema={searchPickers((ps) => ps.find((p) => p.id === picker.command))}
              picker={picker}
            />
          )}
        </For>
      </St.BoxLayout>
    </St.BoxLayout>
  )
}
