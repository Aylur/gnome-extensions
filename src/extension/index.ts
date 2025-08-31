import { Extension } from "resource:///org/gnome/shell/extensions/extension.js"
import { GnofiProvider } from "#/Gnofi"
import { createRoot } from "gnim"
import { SettingsProvider } from "~schemas"
import GnofiPanelButton from "#/GnofiPanelButton"
import GnofiWindow from "#/GnofiWindow"
import useInjections from "#/injections"
import { ExtensionProvider } from "#/extenstion"
import useExportDBusService from "#/dbus"

export default class extends Extension {
  enable(): void {
    createRoot((dispose) => {
      this.disable = dispose

      ExtensionProvider(this, () => {
        SettingsProvider(this.getSettings(), () => {
          GnofiProvider(() => {
            GnofiPanelButton()
            GnofiWindow()
            useInjections()
            useExportDBusService()
          })
        })
      })
    })
  }
}
