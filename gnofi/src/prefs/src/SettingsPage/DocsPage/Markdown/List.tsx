import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import type { Node } from "gnim"

export default function List(props: {
  children: Node[]
  ordered?: boolean | null
  start?: number | null
}) {
  let counter = props.start ?? 1

  return (
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
      {props.children.map((child) => (
        <Gtk.Box>
          <Gtk.Label
            label={props.ordered ? `${counter++}. ` : "• "}
            valign={Gtk.Align.START}
            halign={Gtk.Align.END}
            widthRequest={14}
          />
          <Adw.Bin hexpand>{child}</Adw.Bin>
        </Gtk.Box>
      ))}
    </Gtk.Box>
  )
}
