import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import { useStyle } from "gnim-hooks/gtk4"
import type { Node } from "gnim"

export default function Container(props: { children: Node | Node[]; type: string }) {
  const [type, ...rest] = props.type.split(" ")

  let icon = ""
  let title = ""
  let color = ""

  switch (type) {
    case "[!NOTE]":
      icon = "info-outline-symbolic"
      title = _("Note")
      break
    case "[!INFO]":
      icon = "info-outline-symbolic"
      title = _("Info")
      break
    case "[!TIP]":
      icon = "dialog-information-symbolic"
      color = "alpha(var(--accent-blue), 0.2)"
      title = _("Tip")
      break
    case "[!IMPORTANT]":
      icon = "exclamation-mark-symbolic"
      color = "alpha(var(--accent-purple), 0.2)"
      title = _("Important")
      break
    case "[!WARNING]":
      icon = "warning-outline-symbolic"
      color = "alpha(var(--warning-bg-color), 0.2)"
      title = _("Warning")
      break
    case "[!CAUTION]":
      icon = "caution-outline-symbolic"
      color = "alpha(var(--destructive-bg-color), 0.2)"
      title = _("Caution")
      break
    default:
      throw Error(`unknown type ${props.type}`)
  }

  if (rest.length > 0) {
    title = rest.join(" ")
  }

  const style = useStyle(
    color
      ? {
          "background-color": color,
        }
      : {},
  )

  return (
    <Adw.Bin cssClasses={[style, "card"]}>
      <Gtk.Box
        marginBottom={12}
        marginTop={12}
        marginEnd={12}
        marginStart={12}
        orientation={Gtk.Orientation.VERTICAL}
      >
        <Gtk.Box spacing={6} marginBottom={6}>
          {icon && <Gtk.Image iconName={icon} pixelSize={16} />}
          <Gtk.Label class="title-4" label={title} />
        </Gtk.Box>
        <>{props.children}</>
      </Gtk.Box>
    </Adw.Bin>
  )
}
