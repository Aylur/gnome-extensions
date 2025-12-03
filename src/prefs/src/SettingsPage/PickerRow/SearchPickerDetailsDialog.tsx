import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { SearchPickerSchema } from "~schemas"
import { createState, createRoot, With } from "gnim"
import LayoutRows from "./LayoutRows"
import { getSymbolicAppIcon } from "#/utils"

export default function SearchPickerDetailsDialog(props: {
  window: Adw.Window
  schema: SearchPickerSchema
  onChange: (schema: SearchPickerSchema) => void
}) {
  const [schema, setSchema] = createState(props.schema)
  const appName = schema((s) => s.appInfo?.get_name() ?? "")
  const appIcon = schema((s) => getSymbolicAppIcon(s.appInfo))

  const set = <Key extends keyof SearchPickerSchema>(
    key: Key,
    value: SearchPickerSchema[Key],
  ) => {
    setSchema((prev) => prev.copy({ [key]: value }))
    props.onChange(schema.peek())
  }

  return createRoot((dipose) => (
    <Adw.Dialog
      contentWidth={520}
      title={t("Provider Settings")}
      onClosed={dipose}
      $={(self) => self.present(props.window)}
    >
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top">
          <With value={appIcon}>
            {(icon) =>
              icon && (
                <Gtk.Image
                  marginStart={8}
                  pixelSize={20}
                  gicon={icon}
                  valign={Gtk.Align.CENTER}
                />
              )
            }
          </With>
          <Adw.WindowTitle
            $type="title"
            title={t("Provider Settings")}
            subtitle={appName}
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
            <Adw.SwitchRow
              title={t("Copy Only")}
              subtitle={t(
                "When clipboard text is available copy without activating the item",
              )}
              active={schema((s) => s.copyOnly)}
              onNotifyActive={({ active }) => set("copyOnly", active)}
            />
          </Adw.PreferencesGroup>
        </Gtk.ScrolledWindow>
      </Adw.ToolbarView>
    </Adw.Dialog>
  ))
}
