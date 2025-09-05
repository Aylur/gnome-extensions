import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import Gdk from "gi://Gdk"
import GLib from "gi://GLib"
import GnofiLogger from "~dbus/GnofiLogger"
import type { Log } from "~dbus/GnofiLogger"
import { Accessor, createRoot, createState, onCleanup } from "gnim"

function now() {
  return GLib.DateTime.new_now_local().format("%H:%M:%S.%f")?.slice(0, -3)
}

function levelClass(level: GLib.LogLevelFlags) {
  const { LEVEL_MESSAGE, LEVEL_WARNING, LEVEL_ERROR } = GLib.LogLevelFlags
  if ((level & LEVEL_MESSAGE) === LEVEL_MESSAGE) return "accent"
  if ((level & LEVEL_WARNING) === LEVEL_WARNING) return "warning"
  if ((level & LEVEL_ERROR) === LEVEL_ERROR) return "error"
}

function LogLabel([log, level]: Log, timestamp = now()) {
  return (
    <Gtk.Box spacing={4}>
      <Gtk.Label class={levelClass(level)} label={timestamp} />
      <Gtk.Label label={log} selectable />
    </Gtk.Box>
  )
}

export default function ExternalPickerLogsPage(props: {
  window: Adw.PreferencesWindow
  pickerName: string
  pickerId: string
  logsInMemory: Accessor<boolean>
}) {
  let content: Gtk.Box
  let fullText: Array<string>
  let proxy: GnofiLogger | null = null

  const { window, pickerName, pickerId, logsInMemory } = props
  const [empty, setEmpty] = createState(true)

  function copy() {
    const cb = Gdk.Display.get_default()!.get_clipboard()!
    const text = new TextEncoder().encode(fullText.join("\n"))
    cb.set_content(Gdk.ContentProvider.new_for_bytes("text/plain", text))
    window.add_toast(new Adw.Toast({ title: _("Copied logs to clipboard"), timeout: 2 }))
  }

  function clear() {
    proxy?.Clear(pickerId).catch(logError)
  }

  async function init(scrolledwindow: Gtk.ScrolledWindow) {
    proxy = await GnofiLogger.proxy()

    function clear() {
      setEmpty(true)
      content = Gtk.Box.new(Gtk.Orientation.VERTICAL, 2)
      scrolledwindow.set_child(content)
      fullText = new Array<string>()
    }

    function scrollToBottom() {
      scrolledwindow.vadjustment.value =
        scrolledwindow.vadjustment.upper - scrolledwindow.vadjustment.pageSize
    }

    function append([log, level]: Log) {
      if (log) {
        setEmpty(false)
        const timestamp = now()
        content.append(LogLabel([log, level], timestamp) as Gtk.Widget)
        fullText.push(`${timestamp} ${log}`)
        scrollToBottom()
      }
    }

    proxy.connect("cleared", (_, id) => {
      if (id === pickerId) {
        clear()
      }
    })

    proxy.connect("log", (_, id, log, level) => {
      if (id === pickerId) {
        append([log, level])
      }
    })

    clear()

    const [logs] = await proxy.GetLogs(pickerId).catch((error) => {
      logError(error)
      return [[]]
    })

    for (const log of logs) {
      append(log)
    }

    scrollToBottom()
  }

  return createRoot((dispose) => {
    onCleanup(() => {
      proxy?.stop()
    })

    return (
      <Adw.NavigationPage $={(self) => window.push_subpage(self)} onHiding={dispose}>
        <Adw.ToolbarView>
          <Adw.HeaderBar $type="top">
            <Adw.WindowTitle $type="title" title={pickerName} />
            <Gtk.Button $type="end" visible={empty((e) => !e)} onClicked={copy}>
              <Adw.ButtonContent iconName="edit-copy-symbolic" label={_("Copy")} />
            </Gtk.Button>
            <Gtk.Button $type="end" visible={empty((e) => !e)} onClicked={clear}>
              <Adw.ButtonContent iconName="user-trash-symbolic" label={_("Clear")} />
            </Gtk.Button>
          </Adw.HeaderBar>
          <Gtk.Box marginBottom={16} marginStart={16} marginEnd={16}>
            <Adw.StatusPage
              hexpand
              visible={empty}
              iconName="utilities-terminal-symbolic"
              title={_("Empty logs")}
              description={logsInMemory((b) =>
                b
                  ? _("This picker has not yet logged anything.")
                  : _("There is no logs recorded yet."),
              )}
            />
            <Gtk.ScrolledWindow visible={empty((e) => !e)} $={init} hexpand vexpand>
              <Gtk.Box class="view" orientation={Gtk.Orientation.VERTICAL} />
            </Gtk.ScrolledWindow>
          </Gtk.Box>
        </Adw.ToolbarView>
      </Adw.NavigationPage>
    )
  })
}
