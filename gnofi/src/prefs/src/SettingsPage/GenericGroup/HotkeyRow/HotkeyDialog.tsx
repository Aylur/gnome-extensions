import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Gtk from "gi://Gtk"
import Gdk from "gi://Gdk"
import Adw from "gi://Adw"
import { createRoot, createState } from "gnim"
import { enterKeyboardShortcutIcon } from "#data"

type HotkeyDialogPros = {
  window: Gtk.Window
  onApply: (key: string) => void
}

// TODO:
// - check for conflicts
export default function HotkeyDialog({ window, onApply }: HotkeyDialogPros) {
  let dialog: Adw.Dialog
  const { SUPER_MASK, ALT_MASK, CONTROL_MASK, SHIFT_MASK } = Gdk.ModifierType
  const [accel, setAccel] = createState("")

  function onPressed(
    _: Gtk.EventControllerKey,
    keyval: number,
    _code: number,
    state: Gdk.ModifierType,
  ) {
    if (keyval === Gdk.KEY_Escape) {
      return dialog.close()
    }

    if (keyval === Gdk.KEY_BackSpace) {
      onApply("")
      return dialog.close()
    }

    const key = Gdk.keyval_name(keyval)
    const supr = (state & SUPER_MASK) === SUPER_MASK
    const ctrl = (state & CONTROL_MASK) === CONTROL_MASK
    const alt = (state & ALT_MASK) === ALT_MASK
    const shift = (state & SHIFT_MASK) === SHIFT_MASK

    let keystr = ""

    if (ctrl) keystr += "<Ctrl>"
    if (supr) keystr += "<Super>"
    if (alt) keystr += "<Alt>"
    if (shift) keystr += "<Shift>"

    setAccel(keystr + key)
  }

  function apply() {
    onApply(accel.peek())
    dialog.close()
  }

  function init(self: Adw.Dialog) {
    dialog = self
    const toplevel = window.get_surface() as Gdk.Toplevel
    toplevel.inhibit_system_shortcuts(null)
    self.connect("closed", () => toplevel.restore_system_shortcuts())
    self.present(window)
  }

  return createRoot((dispose) => (
    <Adw.Dialog
      $={init}
      onClosed={dispose}
      title={t("Modify Hotkey")}
      contentWidth={400}
      contentHeight={300}
    >
      <Adw.ToolbarView>
        <Gtk.HeaderBar $type="top" showTitleButtons={accel((a) => !a)}>
          <Gtk.Button
            $type="start"
            label={t("Cancel")}
            onClicked={() => dialog.close()}
            visible={accel(Boolean)}
          />
          <Adw.WindowTitle $type="title" title={t("Modify Hotkey")} />
          <Gtk.Button
            $type="end"
            class="suggested-action"
            label={t("Apply")}
            onClicked={apply}
            visible={accel(Boolean)}
          />
        </Gtk.HeaderBar>
        <Gtk.Box
          valign={Gtk.Align.CENTER}
          orientation={Gtk.Orientation.VERTICAL}
          spacing={12}
          marginTop={32}
          marginBottom={32}
          marginStart={32}
          marginEnd={32}
        >
          <Gtk.Label label={t("Enter a new shortcut")} visible={accel((a) => !a)} />
          <Gtk.Image
            pixelSize={156}
            gicon={enterKeyboardShortcutIcon}
            visible={accel((a) => !a)}
          />
          <Gtk.ShortcutsShortcut
            vexpand
            halign={Gtk.Align.CENTER}
            visible={accel(Boolean)}
            accelerator={accel}
          />
          <Gtk.Label
            wrap
            maxWidthChars={30}
            xalign={0.5}
            halign={Gtk.Align.CENTER}
            label={t("Press Esc to cancel or Backspace to disable the keyboard shortcut")}
          />
        </Gtk.Box>
      </Adw.ToolbarView>
      <Gtk.EventControllerKey onKeyPressed={onPressed} />
    </Adw.Dialog>
  ))
}
