import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import GnofiExtension from "~dbus/GnofiExtension"
import GnomeExtensions from "~dbus/GnomeExtensions"
import { useSettings } from "~schemas"
import { usePrefs } from "./prefs"
import { sendNotification } from "~dbus/Notifications"
import { gnofiLogoPath } from "#data"

async function sendInitialNotification(uuid: string) {
  try {
    const proxy = await GnomeExtensions.proxy()
    const [info] = await proxy.GetExtensionInfo(uuid)
    const enabled = info["enabled"]?.unpack<boolean>()
    proxy.stop()

    if (enabled) {
      const proxy = await new GnofiExtension().proxy()
      await proxy.SendTipMessage()
      proxy.stop()
    } else {
      await sendNotification({
        imagePath: gnofiLogoPath,
        summary: t("Tip"),
        body: t(
          'If you want to take advantage of Gnofi\'s extensible features and improve your workflow even more, try clicking the version number in the "About" page.',
        ),
      })
    }
  } catch (error) {
    console.error(error)
  }
}

export default function useInitialNotification() {
  const { initialNotification, setInitialNotification, showHiddenOptions } = useSettings()
  const { uuid } = usePrefs()

  if (initialNotification.peek() && !showHiddenOptions.peek()) {
    if (!import.meta.DEVEL) {
      setInitialNotification(false)
    }

    sendInitialNotification(uuid)
  }
}
