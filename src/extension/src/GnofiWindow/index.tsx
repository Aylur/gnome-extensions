import St from "gi://St"
import Modal from "#/widgets/Modal"
import Clutter from "gi://Clutter"
import { useGnofi } from "#/Gnofi"
import { createBinding, createComputed, createState, onCleanup, This } from "gnim"
import { useSettings } from "~schemas"
import Pickers from "./Pickers"
import Controls from "./Controls"

export default function GnofiWindow() {
  let modal: Modal
  let entry: St.Entry

  const { gnofi } = useGnofi()
  const isOpen = createBinding(gnofi, "isOpen")
  const text = createBinding(gnofi, "text")
  const activePicker = createBinding(gnofi, "activePicker")
  const [entryFocused, setEntryFocused] = createState(false)
  const { windowWidth, windowMarginTop, focusableEntry, commands } = useSettings()

  const hintText = createComputed((get) => {
    const { hint } = get(activePicker)
    const { length } = Object.entries(get(commands))
    return length === 0
      ? _("Start typing to search...")
      : hint || "Type ':' for list of commands"
  })

  const focusHandler = gnofi.connect("focus", (_, target) => {
    if (target === "entry") {
      entry.grab_key_focus()
      modal.keyFocus = entry
    } else {
      modal.focus(target)
    }
  })

  const openHandler = isOpen.subscribe(() => {
    if (isOpen.get()) {
      gnofi.focus("entry")
    }
  })

  onCleanup(() => {
    gnofi.disconnect(focusHandler)
    openHandler()
  })

  function onKeyPress(_: any, event: Clutter.Event) {
    return gnofi.keypress({
      focusedEntry: entry.clutterText.has_key_focus(),
      controlMod: event.has_control_modifier(),
      key: event.get_key_symbol(),
    })
  }

  return (
    <Modal
      $={(self) => (modal = self)}
      isOpen={isOpen}
      onHide={() => (gnofi.close(), (gnofi.text = ""))}
      onKeyPressEvent={onKeyPress}
      class="popup-menu"
    >
      <St.BoxLayout
        class="popup-menu-content gnofi-picker-content"
        reactive
        onButtonPressEvent={() => true} // avoid closing modal
        orientation={Clutter.Orientation.VERTICAL}
        style={windowMarginTop((m) => `margin-top: ${m}px`)}
        width={windowWidth}
        yExpand
        xExpand
        yAlign={Clutter.ActorAlign.START}
        xAlign={Clutter.ActorAlign.CENTER}
      >
        <St.BoxLayout xExpand class="gnofi-entry-box">
          <St.Icon
            class="gnofi-picker-icon"
            iconSize={20}
            iconName={activePicker((p) => p.icon || "system-search-symbolic")}
            pseudoClass={entryFocused((f) => (f ? "focus" : ""))}
          />
          <St.Entry
            class="gnofi-picker-entry"
            canFocus={focusableEntry}
            hintText={hintText}
            xExpand
            $={(self) => (
              <This
                xExpand
                this={(entry = self).clutterText}
                text={text}
                onNotifyText={({ text }) => (gnofi.text = text)}
                onKeyFocusIn={() => setEntryFocused(true)}
                onKeyFocusOut={() => setEntryFocused(false)}
                onKeyPressEvent={onKeyPress}
              />
            )}
          />
          <Controls />
        </St.BoxLayout>
        <Pickers />
      </St.BoxLayout>
    </Modal>
  )
}
