import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import { useSettings } from "~schemas"
import Adw from "gi://Adw"
import { usePrefs } from "#/prefs"
import DocsPage from "./DocsPage"

export default function ExternalPickersGroup() {
  const { window, uuid, extensionsProxy } = usePrefs()
  const { showHiddenOptions, saveLogsInMemory, setSaveLogsInMemory } = useSettings()

  async function reload() {
    await extensionsProxy.DisableExtension(uuid)
    await extensionsProxy.EnableExtension(uuid)
  }

  return (
    <Adw.PreferencesGroup visible={showHiddenOptions} title={_("External Pickers")}>
      <Adw.SwitchRow
        title={_("Save Logs in Memory")}
        subtitle={_(
          "This makes logs persistent across opening the log page of external pickers.",
        )}
        active={saveLogsInMemory}
        onNotifyActive={({ active }) => setSaveLogsInMemory(active)}
      />
      <Adw.ButtonRow
        startIconName="open-book-symbolic"
        title={_("Open IPC Documentation")}
        onActivated={() => void DocsPage({ window })}
      />
      <Adw.ButtonRow
        startIconName="view-refresh-symbolic"
        title={_("Reload Gnofi")}
        onActivated={() => void reload()}
      />
    </Adw.PreferencesGroup>
  )
}
