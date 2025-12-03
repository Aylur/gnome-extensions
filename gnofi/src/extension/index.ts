import { Extension } from "resource:///org/gnome/shell/extensions/extension.js"
import { GnofiProvider } from "#/Gnofi"
import { createRoot } from "gnim"
import { SettingsProvider } from "~schemas"
import { ExtensionProvider, ExtensionProps } from "#/extenstion"
import GnofiPanelButton from "#/GnofiPanelButton"
import GnofiWindow from "#/GnofiWindow"
import useExportDBusService from "#/dbus"
import useInjections from "#/injections"

export default class extends Extension {
  enable(): void {
    createRoot((dispose) => {
      this.disable = dispose

      const ext: ExtensionProps = {
        uuid: this.uuid,
        openPreferences: this.openPreferences.bind(this),
        gettext: this.gettext.bind(this),
        ngettext: this.ngettext.bind(this),
        pgettext: this.pgettext.bind(this),
      }

      ExtensionProvider(ext, () => {
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
