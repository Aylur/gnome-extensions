import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import { createRoot, onCleanup, This } from "gnim"
import { SettingsProvider, useSettings } from "~schemas"
import { PrefsContext, type PrefsProps } from "#/prefs"
import AboutPage from "#/AboutPage"
import { loadIcons } from "#data"
import SupportPage from "#/SupportPage"
import SettingsPage from "#/SettingsPage"
import GnomeExtensions from "~dbus/GnomeExtensions"
import useInitialNotification from "#/initialNotification"

export default class extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    if (import.meta.DEVEL) window.add_css_class("devel")

    loadIcons()

    const proxy = await GnomeExtensions.proxy()
    const [info] = await proxy.GetExtensionInfo(this.uuid)
    const version = info["version"]?.unpack<number>() || null

    const prefs: PrefsProps = {
      window,
      version,
      uuid: this.uuid,
      extensionsProxy: proxy,
    }

    createRoot((dispose) => {
      window.connect("close-request", dispose)
      onCleanup(() => proxy.stop())

      SettingsProvider(this.getSettings(), () => {
        PrefsContext.provide(prefs, () => {
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
