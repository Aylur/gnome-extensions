import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gio from "gi://Gio"
import Gtk from "gi://Gtk"
import { createRoot, createState, For } from "gnim"
import { findProviders } from "gnofi"
import { SearchPickerSchema } from "~schemas"
import { getSymbolicAppIcon } from "#/utils"

type Provider = ReturnType<typeof findProviders>[number]

export default function SearchProviderListDialog(props: {
  window: Adw.Window
  filter?: (provider: Provider) => boolean
  onSelect: (provider: SearchPickerSchema) => void
}) {
  let dialog: Adw.Dialog

  const [filter, setFilter] = createState("")

  const fullList = findProviders()
    .filter(props.filter ?? (() => true))
    .map((provider) => ({ provider, app: Gio.DesktopAppInfo.new(provider.desktopId) }))
    .filter(({ app }) => app !== null)

  const list = filter((f) =>
    f === ""
      ? fullList
      : fullList.filter(({ app }) => app.get_name().toLowerCase().includes(f)),
  )

  function init(self: Adw.Dialog) {
    dialog = self
    dialog.present(props.window)
  }

  function select(provider: Provider) {
    props.onSelect(SearchPickerSchema.new(provider))
    dialog.close()
  }

  return createRoot((dispose) => (
    <Adw.Dialog
      title={_("Pick a Provider")}
      $={init}
      onClosed={dispose}
      contentWidth={400}
    >
      <Adw.ToolbarView topBarStyle={Adw.ToolbarStyle.RAISED}>
        <Adw.HeaderBar $type="top">
          <Gtk.SearchEntry
            $type="title"
            $={(self) => self.set_key_capture_widget(props.window)}
            onSearchChanged={({ text }) => setFilter(text.toLowerCase())}
            onStopSearch={() => dialog.close()}
            placeholderText={_("Pick a provider")}
            searchDelay={0}
          />
        </Adw.HeaderBar>
        <Gtk.ScrolledWindow propagateNaturalHeight propagateNaturalWidth>
          <Gtk.Box orientation={Gtk.Orientation.VERTICAL} css="padding: 12px;">
            <For each={list}>
              {({ app, provider }) => (
                <Gtk.Button class="flat" onClicked={() => select(provider)}>
                  <Gtk.Box spacing={4}>
                    {getSymbolicAppIcon(app) && (
                      <Gtk.Image gicon={getSymbolicAppIcon(app)!} pixelSize={26} />
                    )}
                    <Gtk.Label label={app.get_name()} />
                  </Gtk.Box>
                </Gtk.Button>
              )}
            </For>
          </Gtk.Box>
        </Gtk.ScrolledWindow>
      </Adw.ToolbarView>
    </Adw.Dialog>
  ))
}
