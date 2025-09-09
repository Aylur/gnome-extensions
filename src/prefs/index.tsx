import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
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
  private async fillWindow(window: Adw.PreferencesWindow) {
    if (import.meta.DEVEL) window.add_css_class("devel")

    loadIcons()

    const proxy = await GnomeExtensions.proxy()
    const [info] = await proxy.GetExtensionInfo(this.uuid)
    const version = info["version"]?.unpack<number>() || import.meta.VERSION

    const prefs: PrefsProps = {
      window,
      version: `${version}`,
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

  // gnome shell v46 does not await, so this has to be sync
  // but we need a placeholder, otherwise it would an error page
  async fillPreferencesWindow(window: Adw.PreferencesWindow) {
    let initialPage: Adw.PreferencesPage | null = null

    this.fillWindow(window).then(() => {
      if (initialPage) {
        window.remove(initialPage)
        initialPage = null
      }
    })

    void (
      <This this={window}>
        <Adw.PreferencesPage $={(self) => (initialPage = self)}>
          <Adw.PreferencesGroup>
            <Adw.Spinner halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} />
          </Adw.PreferencesGroup>
        </Adw.PreferencesPage>
      </This>
    )
  }
}
