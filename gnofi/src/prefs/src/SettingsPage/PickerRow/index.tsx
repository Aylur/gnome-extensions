import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Gtk from "gi://Gtk"
import {
  PickerSchema,
  SearchPickerSchema,
  ExternalPickerSchema,
  useSettings,
  AppPickerSchema,
} from "~schemas"
import SearchPickerDetailsDialog from "./SearchPickerDetailsDialog"
import { usePrefs } from "#/prefs"
import { Accessor } from "gnim"
import ExternalPickerLogsPage from "./ExternalPickerLogsPage"
import Row from "./Row"
import AppPickerDetailsDialog from "./AppPickerDetailsDialog"
import { getSymbolicAppIcon } from "#/utils"

export default function PickerRow<T extends PickerSchema>(props: {
  schema: T
  onChange: (schema: T) => void
  onRemove: () => void
  swappable?: Accessor<boolean>
  onSwap?: (a: PickerSchema, b: PickerSchema) => void
  command?: boolean
  removable?: Accessor<boolean>
}) {
  const { schema, swappable, onChange, onRemove, onSwap, command, removable } = props
  const { window } = usePrefs()
  const { saveLogsInMemory } = useSettings()

  if (schema instanceof SearchPickerSchema) {
    return (
      <Row
        schema={schema}
        gicon={getSymbolicAppIcon(schema.appInfo)}
        label={t("Search Provider")}
        value={schema.appInfo?.get_name() || schema.desktopId}
        {...{ swappable, onRemove, onSwap, command, removable }}
      >
        <Gtk.Button
          class="flat"
          valign={Gtk.Align.CENTER}
          tooltipText={t("Settings")}
          onClicked={() =>
            SearchPickerDetailsDialog({
              window,
              schema,
              onChange: (schema) => onChange(schema as unknown as T),
            })
          }
        >
          <Gtk.Image iconName="org.gnome.Settings-symbolic" />
        </Gtk.Button>
      </Row>
    )
  }

  if (schema instanceof ExternalPickerSchema) {
    return (
      <Row
        schema={schema}
        iconName={
          schema.type === "transient"
            ? "application-x-executable-symbolic"
            : "application-x-sharedlib-symbolic"
        }
        label={
          schema.type === "transient"
            ? t("Transient IPC Plugin")
            : t("Persistent IPC Plugin")
        }
        value={schema.name || schema.executable}
        {...{ swappable, onRemove, onSwap, command, removable }}
      >
        <Gtk.Button
          class="flat"
          valign={Gtk.Align.CENTER}
          tooltipText={t("Open Logs")}
          onClicked={() => {
            ExternalPickerLogsPage({
              window,
              logsInMemory: saveLogsInMemory,
              pickerName: schema.name,
              pickerId: schema.id,
            })
          }}
        >
          <Gtk.Image iconName="utilities-terminal-symbolic" />
        </Gtk.Button>
      </Row>
    )
  }

  if (schema instanceof AppPickerSchema) {
    return (
      <Row
        schema={schema}
        iconName="system-search-symbolic"
        label={t("Builtin Picker")}
        value={t("App Picker")}
        {...{ swappable, onRemove, onSwap, command, removable }}
      >
        <Gtk.Button
          class="flat"
          valign={Gtk.Align.CENTER}
          tooltipText={t("Settings")}
          onClicked={() =>
            AppPickerDetailsDialog({
              window,
              schema,
              onChange: (schema) => onChange(schema as unknown as T),
            })
          }
        >
          <Gtk.Image iconName="org.gnome.Settings-symbolic" />
        </Gtk.Button>
      </Row>
    )
  }

  throw Error("unknown schema type")
}
