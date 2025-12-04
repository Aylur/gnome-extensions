import Adw from "gi://Adw"
import PreferencesPage from "./PreferencesPage"
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import { This, createRoot } from "gnim"
import { createExtensionSettings, SettingsContext } from "~schemas"

export default class extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = createExtensionSettings(this.getSettings())

    createRoot((dispose) => (
      <This this={window} onCloseRequest={dispose}>
        <SettingsContext value={settings}>
          {() => <PreferencesPage window={window} />}
        </SettingsContext>
      </This>
    ))
  }
}
