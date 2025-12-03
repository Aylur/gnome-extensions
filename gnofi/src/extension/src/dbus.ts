import GLib from "gi://GLib"
import GnofiExtensionDBus from "~dbus/GnofiExtension"
import { useSettings } from "~schemas"
import { useGnofi } from "./Gnofi"
import { onCleanup } from "gnim"
import { useExtension } from "./extenstion"
import { sendNotification } from "~dbus/Notifications"

export default function useExportDBusService() {
  const { openPreferences, gettext: t } = useExtension()
  const { gnofi } = useGnofi()
  const { setPreferencesPage } = useSettings()

  const dbus = new GnofiExtensionDBus()

  dbus.serveExtension({
    async open(text) {
      gnofi.open(text)
    },
    async sendTipMessage() {
      sendNotification({
        imagePath: GLib.path_get_dirname(import.meta.url) + "/data/gnofi.svg",
        summary: t("Tip"),
        body: t(
          'If you want to take advantage of Gnofi\'s extensible features and improve your workflow even more, try clicking the version number in the "About" page.',
        ),
        actions: [
          [
            t("Open About Page"),
            () => {
              setPreferencesPage("about")
              openPreferences()
            },
          ],
        ],
      })
    },
  })

  onCleanup(() => dbus.stop())
}
