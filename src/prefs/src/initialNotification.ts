import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import GnofiExtension from "~dbus/GnofiExtension"
import { useSettings } from "~schemas"
import { usePrefs } from "./prefs"
import { sendNotification } from "~dbus/Notifications"
import { gnofiLogoPath } from "#data"

async function sendInitialNotification(isGnofiEnabled: Promise<boolean>) {
  const enabled = await isGnofiEnabled

  try {
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
  const { extensionsProxy, uuid } = usePrefs()

  if (initialNotification.get() && !showHiddenOptions.get()) {
    if (!import.meta.DEVEL) {
      setInitialNotification(false)
    }

    sendInitialNotification(
      extensionsProxy
        .GetExtensionInfo(uuid)
        .then(([info]) => info["enabled"]?.unpack<boolean>() ?? false),
    )
  }
}
