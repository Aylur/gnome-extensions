import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import HotkeyDialog from "./HotkeyDialog"
import { Accessor } from "gnim"
import { usePrefs } from "#/prefs"

export default function HotkeyRow(props: {
  title: string
  subtitle: string
  hotkey: Accessor<string[]>
  onChange: (accel: string[]) => void
}) {
  const accel = props.hotkey(([accel = ""]) => accel)
  const { window } = usePrefs()

  function grabHotkey() {
    HotkeyDialog({ window, onApply: (accel) => props.onChange([accel]) })
  }

  return (
    <Adw.ActionRow
      title={props.title}
      subtitle={props.subtitle}
      activatable
      onActivated={grabHotkey}
    >
      <Gtk.Box $type="suffix" spacing={6}>
        <Gtk.Label class="dimmed" label={_("Disabled")} visible={accel((a) => !a)} />
        <Gtk.ShortcutsShortcut
          hexpand
          halign={Gtk.Align.END}
          accelerator={accel}
          visible={accel(Boolean)}
        />
        <Gtk.Button
          valign={Gtk.Align.CENTER}
          class="flat"
          iconName="edit-clear-symbolic"
          onClicked={() => props.onChange([])}
          tooltipText={_("Disable Hotkey")}
          visible={accel(Boolean)}
        />
      </Gtk.Box>
    </Adw.ActionRow>
  )
}
