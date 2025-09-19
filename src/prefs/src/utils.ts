import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import Gdk from "gi://Gdk"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { useEffect } from "gnim-hooks"
import { Accessor } from "gnim"

export function traverseWidgetTree(
  widget: Gtk.Widget | null,
  fn: (widget: Gtk.Widget) => void | boolean,
) {
  if (!widget) return

  let child = widget.get_first_child()
  while (child !== null) {
    fn(child)
    traverseWidgetTree(child, fn)
    child = child.get_next_sibling()
  }
}

export function copyToClipboard(text: string, window?: Adw.PreferencesWindow) {
  const cb = Gdk.Display.get_default()!.get_clipboard()!
  cb.set_content(
    Gdk.ContentProvider.new_for_bytes("text/plain", new TextEncoder().encode(text)),
  )
  window?.add_toast(
    new Adw.Toast({
      title: t("Copied code to clipboard"),
      timeout: 1,
    }),
  )
}

export function isValidUri(uri: string) {
  try {
    GLib.uri_parse(uri, GLib.UriFlags.NONE)
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export function openUri(uri: string) {
  const scheme = GLib.uri_parse(uri, GLib.UriFlags.NONE).get_scheme()
  const info = Gio.AppInfo.get_default_for_uri_scheme(scheme)
  if (info) info.launch_uris([uri], null)
}

export function chunks<T>(size: number, arr: T[]): T[][] {
  const result = [] as T[][]
  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size)
    result.push(chunk)
  }
  return result
}

export function getSymbolicAppIcon(appInfo?: Gio.DesktopAppInfo) {
  let icon = appInfo?.get_string("Icon")
  if (icon && !icon.endsWith("-symbolic")) icon += "-symbolic"

  const iconName =
    icon &&
    Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!).has_icon(icon) &&
    icon

  return iconName ? Gio.Icon.new_for_string(iconName) : appInfo?.get_icon()
}

// avoid using Adw.ToggleGroup to support older versions
export function useToggleGroup(selected: Accessor<boolean>) {
  return (self: Gtk.Button) => {
    useEffect((get) => {
      if (get(selected)) {
        self.remove_css_class("flat")
      } else {
        self.add_css_class("flat")
      }
    })
  }
}
