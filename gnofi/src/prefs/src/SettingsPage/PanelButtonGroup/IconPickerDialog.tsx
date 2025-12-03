import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import GLib from "gi://GLib"
import Adw from "gi://Adw"
import Gio from "gi://Gio"
import Gtk from "gi://Gtk"
import Gdk from "gi://Gdk"
import { With, createState } from "gnim"
import { dataPath } from "#data"

type IconPickerDialogProp = {
  window: Adw.Window
  onPicked: (icon: string) => void
}

function icon(name: string) {
  const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)
  return iconTheme.get_icon_names().includes(name)
    ? Gio.ThemedIcon.new(name)
    : Gio.FileIcon.new(Gio.File.new_for_uri(`${dataPath}/button-icons/${name}.svg`))
}

const distroLogo = GLib.get_os_info("LOGO")

const icons = [
  ...(distroLogo ? [distroLogo] : []),
  "system-search-symbolic",
  "adwaita-symbolic",
  "folder-gnome-symbolic",
  "applications-utilities-symbolic",
  "background-app-ghost-symbolic",
  "compass-symbolic",
  "fire-symbolic",
  "leaf-symbolic",
  "penguin-alt-symbolic",
  "utilities-terminal-symbolic",
  "list-symbolic",
  "grid-symbolic",
  "grid-filled-symbolic",
  "view-app-grid-symbolic",
  "view-grid-symbolic",
  "menu-symbolic",
  "list-compact-symbolic",
  "open-menu-symbolic",
  "view-list-bullet-symbolic",
]

export default function IconPickerDialog({ onPicked, window }: IconPickerDialogProp) {
  let searchentry: Gtk.SearchEntry
  let toastoverlay: Adw.ToastOverlay

  const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)
  const [iconNames, setIconNames] = createState(new Array<string>())

  function search(text: string) {
    if (!text) return setIconNames([])

    setIconNames(
      iconTheme.iconNames
        .filter((name) => name.toLowerCase().includes(text.toLowerCase()))
        .sort(),
    )
  }

  function init(dialog: Adw.Dialog) {
    dialog.present(window)
    searchentry.grab_focus()
  }

  function pick(name: string) {
    toastoverlay.add_toast(new Adw.Toast({ title: t("Icon set"), timeout: 2 }))
    onPicked(name)
  }

  return (
    <Adw.Dialog $={init} contentHeight={400} contentWidth={320}>
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top">
          <Gtk.SearchEntry
            $type="title"
            $={(self) => (searchentry = self)}
            placeholderText={t("Search for named icons")}
            searchDelay={50}
            onSearchChanged={({ text }) => search(text)}
          />
        </Adw.HeaderBar>
        <Adw.ToastOverlay $={(self) => (toastoverlay = self)}>
          <Gtk.Box>
            <Adw.WrapBox
              css="padding: 12px;"
              lineSpacing={4}
              childSpacing={4}
              visible={iconNames((n) => n.length === 0)}
            >
              {icons.map(icon).map(
                (gicon, _i, _, str = gicon.to_string()) =>
                  str && (
                    <Gtk.Button class="flat" onClicked={() => pick(str)}>
                      <Gtk.Image pixelSize={50} gicon={gicon} />
                    </Gtk.Button>
                  ),
              )}
            </Adw.WrapBox>
            <With value={iconNames}>
              {(icons) =>
                icons.length > 0 && (
                  <Gtk.ScrolledWindow hexpand>
                    <Adw.WrapBox
                      halign={Gtk.Align.CENTER}
                      css="padding: 12px;"
                      lineSpacing={4}
                      childSpacing={4}
                    >
                      {icons.map((icon) => (
                        <Gtk.Button
                          class="flat"
                          tooltipText={icon}
                          onClicked={() => pick(icon)}
                        >
                          <Gtk.Image pixelSize={50} iconName={icon} />
                        </Gtk.Button>
                      ))}
                    </Adw.WrapBox>
                  </Gtk.ScrolledWindow>
                )
              }
            </With>
          </Gtk.Box>
        </Adw.ToastOverlay>
      </Adw.ToolbarView>
    </Adw.Dialog>
  )
}
