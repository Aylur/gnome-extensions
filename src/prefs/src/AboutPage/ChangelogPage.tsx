import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { createRoot, Node } from "gnim"

function Release(props: { version: string; children?: Node }) {
  return (
    <Adw.PreferencesGroup>
      <Adw.PreferencesRow activatable={false}>
        <Gtk.Box
          halign={Gtk.Align.START}
          marginTop={10}
          marginBottom={10}
          marginEnd={14}
          marginStart={14}
          orientation={Gtk.Orientation.VERTICAL}
        >
          <Gtk.Label
            halign={Gtk.Align.START}
            class="title-2"
            label={t("Version %s").format(props.version)}
            marginBottom={12}
          />
          <Gtk.Box spacing={8} orientation={Gtk.Orientation.VERTICAL}>
            {props.children}
          </Gtk.Box>
        </Gtk.Box>
      </Adw.PreferencesRow>
    </Adw.PreferencesGroup>
  )
}

function ChangeSet(props: { title: string; children: Node | Node[] }) {
  return (
    <Gtk.Box halign={Gtk.Align.START} orientation={Gtk.Orientation.VERTICAL}>
      <Gtk.Label
        halign={Gtk.Align.START}
        marginBottom={4}
        class="title-4"
        label={props.title}
      />
      <Gtk.Box
        halign={Gtk.Align.START}
        marginStart={8}
        orientation={Gtk.Orientation.VERTICAL}
      >
        {props.children}
      </Gtk.Box>
    </Gtk.Box>
  )
}

function Change(props: { children: string }) {
  return (
    <Gtk.Box>
      <Gtk.Label label="•" marginEnd={4} valign={Gtk.Align.START} />
      <Gtk.Label wrap halign={Gtk.Align.START} useMarkup label={props.children} />
    </Gtk.Box>
  )
}

export default function ChangelogPage(props: { window: Adw.PreferencesWindow }) {
  return createRoot((dispose) => (
    <Adw.NavigationPage
      $={(self) => props.window.push_subpage(self)}
      onHiding={dispose}
      title={t("Release Notes")}
    >
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top" showTitle />
        <Adw.PreferencesPage>
          <Release version="0.5.2">
            <ChangeSet title={t("Maintenance")}>
              <Change>{t("Update to Gnim 1.9")}</Change>
              <Change>{t("Migrate off of deprecated Gio APIs")}</Change>
            </ChangeSet>
          </Release>
          <Release version="0.5.1">
            <ChangeSet title={t("Maintenance")}>
              <Change>{t("Use gnim-schemas")}</Change>
            </ChangeSet>
          </Release>
          <Release version="0.5.0">
            <ChangeSet title={t("New Features")}>
              <Change>{t("Support older versions of libadwaita")}</Change>
            </ChangeSet>
          </Release>
          <Release version="0.4.0">
            <ChangeSet title={t("New Features")}>
              <Change>
                {t("AppPicker search for GenericName and Keywords desktop entries")}
              </Change>
              <Change>{t("Debounce delay on default search")}</Change>
            </ChangeSet>
          </Release>
          <Release version="0.3.0">
            <ChangeSet title={t("New Features")}>
              <Change>{t("add support for Gnome 46, 47 and 49")}</Change>
            </ChangeSet>
          </Release>
          <Release version="0.2.0">
            <ChangeSet title={t("Changes")}>
              <Change>
                {t("use the same object path for exported dbus interfaces")}
              </Change>
            </ChangeSet>
          </Release>
          <Release version="0.1.3">
            <ChangeSet title={t("Bug Fixes")}>
              <Change>{t("fix extension translations")}</Change>
            </ChangeSet>
          </Release>
          <Release version="0.1.2">
            <ChangeSet title={t("Bug Fixes")}>
              <Change>
                {t("DocsPage: hide search button when the layout is uncollapsed")}
              </Change>
            </ChangeSet>
          </Release>
          <Release version="0.1.1">
            <ChangeSet title={t("Bug Fixes")}>
              <Change>{t("correctly open window on hotkey")}</Change>
            </ChangeSet>
          </Release>
          <Release version="0.1.0">
            <ChangeSet title={t("Features")}>
              <Change>{t("Builtin App Picker")}</Change>
              <Change>{t("SearchProvider Picker")}</Change>
              <Change>{t("External IPC Picker")}</Change>
              <Change>{t("Commands")}</Change>
            </ChangeSet>
          </Release>
        </Adw.PreferencesPage>
      </Adw.ToolbarView>
    </Adw.NavigationPage>
  ))
}
