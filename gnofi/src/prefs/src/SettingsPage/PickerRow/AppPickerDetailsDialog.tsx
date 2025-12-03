import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { AppPickerSchema } from "~schemas"
import { createRoot } from "gnim"
import LayoutRows from "./LayoutRows"

export default function AppPickerDetailsDialog(props: {
  window: Adw.Window
  schema: AppPickerSchema
  onChange: (schema: AppPickerSchema) => void
}) {
  return createRoot((dipose) => (
    <Adw.Dialog
      contentWidth={520}
      title={t("App Picker Settings")}
      onClosed={dipose}
      $={(self) => self.present(props.window)}
    >
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top">
          <Gtk.Image
            marginStart={8}
            pixelSize={20}
            iconName="system-search-symbolic"
            valign={Gtk.Align.CENTER}
          />
          <Adw.WindowTitle
            $type="title"
            title={t("Builtin Picker Settings")}
            subtitle={t("App Picker")}
          />
        </Adw.HeaderBar>
        <Gtk.ScrolledWindow propagateNaturalWidth propagateNaturalHeight>
          <Adw.PreferencesGroup
            marginTop={3}
            marginEnd={12}
            marginStart={12}
            marginBottom={12}
          >
            <LayoutRows schema={props.schema} onChange={props.onChange} />
          </Adw.PreferencesGroup>
        </Gtk.ScrolledWindow>
      </Adw.ToolbarView>
    </Adw.Dialog>
  ))
}
