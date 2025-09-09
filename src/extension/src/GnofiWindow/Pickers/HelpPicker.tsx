import St from "gi://St"
import Clutter from "gi://Clutter"
import { useGnofi } from "#/Gnofi"
import { createBinding, createComputed, For } from "gnim"
import PickerButton from "#/widgets/PickerButton"
import Separator from "#/widgets/Separator"
import { useExtension } from "#/extenstion"

export default function HelpPicker() {
  const { gnofi } = useGnofi()
  const { gettext: t } = useExtension()

  const activePicker = createBinding(gnofi, "activePicker")
  const isActive = activePicker((a) => a === gnofi.builtinHelpPicker)
  const pickers = createBinding(gnofi.builtinHelpPicker, "result")
  const leader = createBinding(gnofi, "commandLeader")

  return (
    <St.BoxLayout xExpand visible={isActive} class="gnofi-help-box" vertical>
      <Separator />
      <St.Label
        xExpand
        xAlign={Clutter.ActorAlign.CENTER}
        class="gnofi-no-match-label"
        visible={pickers((ps) => ps.length === 0)}
        text={t("No commands have been set yet")}
      />
      <St.BoxLayout xExpand vertical visible={pickers((ps) => ps.length > 0)}>
        <For each={pickers}>
          {(picker) => (
            <PickerButton
              padding={[5, 10]}
              onClick={() => (gnofi.text = `${gnofi.commandLeader}${picker.command} `)}
            >
              <St.BoxLayout xExpand>
                <St.Icon
                  iconSize={20}
                  iconName={createBinding(picker, "icon")}
                  css="margin-right:8px"
                />
                <St.Label
                  css="font-weight:bold"
                  text={createComputed(
                    (get) => `${get(leader)}${get(createBinding(picker, "command"))}`,
                  )}
                />
                <St.Label
                  xExpand
                  xAlign={Clutter.ActorAlign.END}
                  text={createBinding(picker, "description")}
                  opacity={200}
                />
              </St.BoxLayout>
            </PickerButton>
          )}
        </For>
      </St.BoxLayout>
    </St.BoxLayout>
  )
}
