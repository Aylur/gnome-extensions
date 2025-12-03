import Adw from "gi://Adw"
import PreferencesPage from "./PreferencesPage"
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import { This } from "gnim"
import { createExtensionSettings, SettingsContext } from "~schemas"

export default class extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = createExtensionSettings(this.getSettings())

    void (
      <This this={window}>
        <SettingsContext value={settings}>
          {() => <PreferencesPage window={window} />}
        </SettingsContext>
      </This>
    )
  }
}
