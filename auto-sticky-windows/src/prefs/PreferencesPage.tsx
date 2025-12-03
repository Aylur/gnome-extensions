import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import { createMemo, For } from "gnim"
import { useSettings } from "~schemas"
import WindowPicker from "~dbus/WindowPicker"

export default function PreferencesPage(props: { window: Adw.PreferencesWindow }) {
  let listEdited = 0

  const {
    whitelistMode,
    setWhitelistMode,
    whitelist,
    setWhitelist,
    blacklist,
    setBlacklist,
  } = useSettings()

  const list = createMemo(() => (whitelistMode() ? whitelist() : blacklist()))

  function setList(value: string[]) {
    if (whitelistMode.peek()) {
      setWhitelist(value)
    } else {
      setBlacklist(value)
    }
  }

  function addItem() {
    setList([...list.peek(), ""])
  }

  function removeItem(index: number) {
    setList(list.peek().filter((_, i) => i !== index))
  }

  function setItem(name: string, index: number) {
    const items = list.peek()
    items[index] = name
    listEdited = index
    setList(items)
  }

  async function pickClass(index: number) {
    const picker = new WindowPicker()

    try {
      const proxy = await picker.proxy()
      const [name] = await proxy.Pick()
      if (name) setItem(name, index)
    } catch (error) {
      props.window.add_toast(
        new Adw.Toast({
          title: _("Could not find window"),
          timeout: 1000,
        }),
      )
    } finally {
      picker.stop()
    }
  }

  return (
    <Adw.PreferencesPage>
      <Adw.PreferencesGroup
        title={whitelistMode((w) =>
          w ? _("Whitelisted items") : _("Blacklisted items"),
        )}
        description={whitelistMode((w) =>
          w
            ? _(
                'In whitelist mode no window is automatically "Always on Top", but only the ones specified in the list below.',
              )
            : _(
                'In blacklist mode every window is automatically "Always on Top", but the ones listed below are not.',
              ),
        )}
      >
        <Gtk.Box $type="header-suffix" valign={Gtk.Align.CENTER} spacing={6}>
          <Gtk.Button onClicked={addItem}>
            <Gtk.Box>
              <Gtk.Image iconName="list-add-symbolic" />
              <Gtk.Label label={_("Add item")} />
            </Gtk.Box>
          </Gtk.Button>
        </Gtk.Box>

        <Adw.SwitchRow
          title={_("Enable Whitelist Mode")}
          active={whitelistMode}
          onNotifyActive={({ active }) => setWhitelistMode(active)}
        />

        <For each={list} id={(name) => ({ name })}>
          {(name, index) => (
            <Adw.EntryRow
              showApplyButton
              title={_("Window class")}
              text={name}
              onApply={({ text }) => setItem(text, index.peek())}
              onEntryActivated={({ text }) => setItem(text, index.peek())}
              $={(self) => index.peek() === listEdited && self.grab_focus()}
            >
              <Gtk.Button
                $type="prefix"
                class="flat"
                valign={Gtk.Align.CENTER}
                iconName="find-location-symbolic"
                onClicked={() => pickClass(index.peek())}
              />
              <Gtk.Button
                $type="suffix"
                class="flat destructive-action"
                valign={Gtk.Align.CENTER}
                iconName="user-trash-symbolic"
                onClicked={() => removeItem(index.peek())}
              />
            </Adw.EntryRow>
          )}
        </For>
      </Adw.PreferencesGroup>
    </Adw.PreferencesPage>
  )
}
