import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
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
            label={_("Version %s").format(props.version)}
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
      title={_("Release Notes")}
    >
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top" showTitle />
        <Adw.PreferencesPage>
          <Release version="3">
            <ChangeSet title={_("New Features")}>
              <Change>{_("prefs: Changelog page")}</Change>
            </ChangeSet>
            <ChangeSet title={_("Changes")}>
              <Change>{_("IPC: add <tt>text</tt> command")}</Change>
              <Change>
                {_("IPC: <tt>open</tt> command no longer clears current picker")}
              </Change>
            </ChangeSet>

            <ChangeSet title={_("Bug Fixes")}>
              <Change>
                {_("PickerWindow: show correct command leader in placeholder text")}
              </Change>
              <Change>
                {_("IPC: scroll to bottom when a log is appended in LogsPage")}
              </Change>
              <Change>
                {_("IPC: issue <tt>clear</tt> command only after window is fully hidden")}
              </Change>
              <Change>
                {_("IPC: correctly assign default <tt>canFocus</tt> property")}
              </Change>
              <Change>
                {_(
                  "SearchProvider: respect desktop file Hidden, NoDisplay, OnlyShowIn and NotShowIn properties",
                )}
              </Change>
            </ChangeSet>
          </Release>

          <Release version="2">
            <ChangeSet title={_("Bug Fixes")}>
              <Change>{_("IPC: docs Container component style")}</Change>
              <Change>{_("IPC: docs Code component style")}</Change>
              <Change>{_("prefs: donation list fetching")}</Change>
            </ChangeSet>
          </Release>

          <Release version="1">
            <ChangeSet title={_("Features")}>
              <Change>{_("App Picker")}</Change>
              <Change>{_("SearchProvider Picker")}</Change>
              <Change>{_("External IPC Picker")}</Change>
              <Change>{_("Commands")}</Change>
            </ChangeSet>
          </Release>
        </Adw.PreferencesPage>
      </Adw.ToolbarView>
    </Adw.NavigationPage>
  ))
}
