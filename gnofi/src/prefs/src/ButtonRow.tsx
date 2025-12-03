import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import Pango from "gi://Pango"
import { onCleanup } from "gnim"
import { $ } from "gnim-hooks"

// Adw.ButtonRow was introduced in 1.6, but we support 1.5
export default function ButtonRow(props: {
  onActivated?: () => void
  startIconName?: $<string>
  title?: $<string>
}) {
  let label: Gtk.Label
  let parent: Gtk.ListBox
  let activateHandler: number

  function init(self: Adw.PreferencesRow) {
    parent = self.get_parent() as Gtk.ListBox
    label.mnemonicWidget = self
    activateHandler = parent.connect("row-activated", (_, row) => {
      if (row === self) {
        props.onActivated?.()
      }
    })
  }

  onCleanup(() => {
    parent.disconnect(activateHandler)
  })

  return (
    <Adw.PreferencesRow
      activatable
      accessibleRole={Gtk.AccessibleRole.BUTTON}
      onNotifyParent={init}
    >
      <Gtk.Box halign={Gtk.Align.CENTER} spacing={6} marginTop={10} marginBottom={10}>
        <Gtk.Image
          visible={$(props.startIconName, Boolean)}
          iconName={$(props.startIconName, (i) => i ?? "image-missing")}
          accessibleRole={Gtk.AccessibleRole.PRESENTATION}
          valign={Gtk.Align.CENTER}
        />
        <Gtk.Label
          $={(s) => (label = s)}
          visible={$(props.title, Boolean)}
          label={props.title}
          ellipsize={Pango.EllipsizeMode.END}
          xalign={0.5}
          justify={Gtk.Justification.CENTER}
          css="font-weight: bold;"
        />
      </Gtk.Box>
    </Adw.PreferencesRow>
  )
}
