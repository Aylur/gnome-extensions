import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import GenericGroup from "./GenericGroup"
import PanelButtonGroup from "./PanelButtonGroup"
import DefaultPickerGroup from "./DefaultPickerGroup"
import CommandsGroup from "./CommandsGroup"
import ExternalPickersGroup from "./ExternalPickersGroup"

export default function SettingsPage() {
  return (
    <Adw.PreferencesPage
      name="settings"
      title={_("Settings")}
      iconName="org.gnome.Settings-symbolic"
    >
      <GenericGroup />
      <PanelButtonGroup />
      <ExternalPickersGroup />
      <DefaultPickerGroup />
      <CommandsGroup />
    </Adw.PreferencesPage>
  )
}
