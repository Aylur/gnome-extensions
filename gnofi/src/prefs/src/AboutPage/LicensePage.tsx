import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { gpl3 } from "#data"
import { createRoot } from "gnim"

export default function LicensePage(props: { window: Adw.PreferencesWindow }) {
  return createRoot((dispose) => (
    <Adw.NavigationPage
      title={t("License")}
      onHiding={dispose}
      $={(self) => props.window.push_subpage(self)}
    >
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top">
          <Adw.WindowTitle $type="title" title={t("License")} />
        </Adw.HeaderBar>
        <Gtk.ScrolledWindow>
          <Gtk.Label
            class="monospace"
            label={gpl3}
            halign={Gtk.Align.CENTER}
            // so it fits in the default 640w window
            css="font-size: 0.88rem"
          />
        </Gtk.ScrolledWindow>
      </Adw.ToolbarView>
    </Adw.NavigationPage>
  ))
}
