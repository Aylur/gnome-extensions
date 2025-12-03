import St from "gi://St"
import { useGnofi } from "#/Gnofi"
import { createBinding, For } from "gnim"
import { useSettings } from "~schemas"
import Picker from "./Picker"

export default function Commands() {
  const { gnofi } = useGnofi()
  const { commands } = useSettings()

  const pickers = createBinding(gnofi, "pickers")
  const activePicker = createBinding(gnofi, "activePicker")

  return (
    <For each={pickers}>
      {(picker) => (
        <St.Bin xExpand visible={activePicker((p) => p === picker)}>
          <Picker
            picker={picker}
            schema={commands((ps) => ps.find((p) => p.id === picker.command))}
          />
        </St.Bin>
      )}
    </For>
  )
}
