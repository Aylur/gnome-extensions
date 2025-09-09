import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import { createRoot, This } from "gnim"
import { SettingsProvider, useSettings } from "~schemas"
import { PrefsContext } from "#/prefs"
import AboutPage from "#/AboutPage"
import { loadIcons } from "#data"
import SupportPage from "#/SupportPage"
import SettingsPage from "#/SettingsPage"
import useInitialNotification from "#/initialNotification"

export default class extends ExtensionPreferences {
  // @ts-expect-error typed as async but Gnome46 is non async
  fillPreferencesWindow(window: Adw.PreferencesWindow) {
    if (import.meta.DEVEL) window.add_css_class("devel")

    loadIcons()

    createRoot((dispose) => {
      window.connect("close-request", dispose)

      SettingsProvider(this.getSettings(), () => {
        PrefsContext.provide({ window, uuid: this.uuid }, () => {
          useInitialNotification()
          const { preferencesPage, setPreferencesPage } = useSettings()

          void (
            <This this={window}>
              <AboutPage />
              <SupportPage />
              <SettingsPage />
            </This>
          )

          void (
            <This
              this={window}
              // visiblePageName has to be set after pages are appended
              visiblePageName={preferencesPage}
              onNotifyVisiblePageName={({ visiblePageName }) => {
                setPreferencesPage(visiblePageName)
              }}
            />
          )
        })
      })
    })
  }
}
