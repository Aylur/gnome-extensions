import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import { CCProps, onCleanup } from "gnim"

export default function Spinner(
  props: Partial<Omit<CCProps<Gtk.Widget, Gtk.Widget.ConstructorProps>, "$constructor">>,
) {
  return Adw.MINOR_VERSION >= 6 ? (
    <Adw.Spinner {...props} />
  ) : (
    <Gtk.Spinner
      $={(self) => {
        self.start()
        onCleanup(() => self.stop())
      }}
      {...props}
    />
  )
}
