import Gio from "gi://Gio"
import GLib from "gi://GLib"
import Gtk from "gi://Gtk"
import Gdk from "gi://Gdk"

// after bundling `import.meta.url` will be prefs.js
export const dataPath = GLib.path_get_dirname(import.meta.url) + "/data"

function fileIcon(name: string) {
  return Gio.FileIcon.new(Gio.File.new_for_uri(dataPath + "/" + name))
}

export const enterKeyboardShortcutIcon = fileIcon("enter-keyboard-shortcut.svg")
export const paypalIcon = fileIcon("paypal.png")
export const kofiIcon = fileIcon("kofi.png")
export const gnofiIcon = fileIcon("gnofi.svg")

export const gnofiLogoPath = `${dataPath}/gnofi.svg`

// @ts-expect-error why does the env.d.ts declaration not work?
import gpl3 from "./gpl3.txt"
export { gpl3 }

export function loadIcons() {
  const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)
  const iconPath = dataPath.replace("file://", "") + "/icons"

  if (!iconTheme.get_search_path()!.includes(iconPath)) {
    iconTheme.add_search_path(iconPath)
  }
}
