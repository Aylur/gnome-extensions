import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import Gdk from "gi://Gdk"
import { createState } from "gnim"

// https://gitlab.gnome.org/GNOME/libadwaita/-/issues/498
export default function MessageRow(props: {
  onChanged: (text: string) => void
  title: string
  initalText: string
}) {
  let textview: Gtk.TextView
  let row: Adw.PreferencesRow

  const [length, setLength] = createState(props.initalText.length)

  function onFocus() {
    if (textview.hasFocus) {
      row.add_css_class("focused")
      row.set_state_flags(Gtk.StateFlags.FOCUSED, false)
    } else {
      row.remove_css_class("focused")
    }
  }

  return (
    <Adw.PreferencesRow
      $={(self) => (row = self)}
      css="padding-top: 10px;"
      activatable
      selectable
      cursor={new Gdk.Cursor({ name: "text" })}
    >
      <Gtk.GestureClick
        onPressed={() => {
          if (!textview.hasFocus) {
            textview.grab_focus()
          }
        }}
      />
      <Gtk.EventControllerKey
        onKeyPressed={(_, key, _n, modifier) => {
          if (modifier === Gdk.ModifierType.NO_MODIFIER_MASK && !textview.hasFocus) {
            textview.grab_focus()
            textview.buffer.text += String.fromCharCode(key)
          }
        }}
      />
      <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
        <Gtk.Box marginStart={12} marginEnd={12} marginBottom={2}>
          <Gtk.Label
            hexpand
            class="dimmed"
            label={props.title}
            halign={Gtk.Align.START}
          />
          <Gtk.Label
            class="dimmed"
            label={length((l) => `${l}`)}
            halign={Gtk.Align.END}
          />
        </Gtk.Box>
        <Gtk.ScrolledWindow propagateNaturalWidth propagateNaturalHeight>
          <Gtk.TextView
            heightRequest={300}
            css="textview { background-color: transparent; padding: 0 12px 12px 12px; }"
            onNotifyHasFocus={onFocus}
            wrapMode={Gtk.WrapMode.WORD}
            $={(self) => (textview = self)}
          >
            <Gtk.TextBuffer
              text={props.initalText}
              onNotifyText={({ text }) => {
                props.onChanged(text)
                setLength(text.length)
              }}
            />
          </Gtk.TextView>
        </Gtk.ScrolledWindow>
      </Gtk.Box>
    </Adw.PreferencesRow>
  )
}
