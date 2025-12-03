import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Gio from "gi://Gio"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { PickerSchema, AppPickerSchema } from "~schemas"
import { usePrefs } from "#/prefs"
import { Accessor, type Node } from "gnim"
import DragAndDrop from "./DragAndDrop"
import ConfirmDialog from "../ConfirmDialog"

export default function Row(props: {
  gicon?: Gio.Icon | null
  iconName?: string
  label: string
  value: string
  children?: Node
  schema: PickerSchema
  removable?: Accessor<boolean>
  onRemove: () => void
  swappable?: Accessor<boolean>
  onSwap?: (a: PickerSchema, b: PickerSchema) => void
  command?: boolean
}) {
  const { window } = usePrefs()
  const {
    gicon,
    iconName,
    label,
    value,
    schema,
    removable,
    swappable,
    onRemove,
    onSwap,
  } = props

  function remove() {
    ConfirmDialog({
      window,
      heading: t("Remove Picker?"),
      body: t("Are you sure you want to remove %s?").format(
        schema instanceof AppPickerSchema ? t("App Picker") : schema.name,
      ),
      confirmText: t("Remove"),
      type: "destructive",
      onConfirm: onRemove,
    })
  }

  return (
    <Adw.ActionRow class="property" title={label} subtitle={value}>
      {iconName && <Gtk.Image $type="prefix" iconName={iconName} pixelSize={32} />}
      {gicon && <Gtk.Image $type="prefix" gicon={gicon} pixelSize={32} />}
      <Gtk.Image
        $type="prefix"
        visible={swappable}
        class="dimmed"
        iconName="list-drag-handle-symbolic"
      />
      {props.command && (
        <Gtk.Label label={schema.id} class="dimmed" valign={Gtk.Align.CENTER} />
      )}
      <Gtk.Button
        visible={removable}
        class="flat destructive-action"
        valign={Gtk.Align.CENTER}
        onClicked={remove}
      >
        <Gtk.Image iconName="user-trash-symbolic" />
      </Gtk.Button>
      {props.children}
      <DragAndDrop
        type={PickerSchema}
        enable={swappable}
        onPrepare={() => schema}
        onDrop={(value) => {
          if (value !== schema && onSwap) onSwap(value, schema)
          return true
        }}
      >
        {(parent) => (
          <Gtk.ListBox
            css="margin:12px;"
            class="background boxed-list"
            widthRequest={parent.get_width()}
          >
            <Adw.ActionRow class="property" title={label} subtitle={value}>
              {iconName && (
                <Gtk.Image $type="prefix" iconName={iconName} pixelSize={32} />
              )}
              {gicon && <Gtk.Image $type="prefix" gicon={gicon} pixelSize={32} />}
              <Gtk.Image
                $type="prefix"
                class="dimmed"
                iconName="list-drag-handle-symbolic"
              />
              <Gtk.Button class="flat destructive-action" valign={Gtk.Align.CENTER}>
                <Gtk.Image iconName="user-trash-symbolic" />
              </Gtk.Button>
              <Gtk.Button class="flat" valign={Gtk.Align.CENTER}>
                <Gtk.Image iconName="org.gnome.Settings-symbolic" />
              </Gtk.Button>
            </Adw.ActionRow>
          </Gtk.ListBox>
        )}
      </DragAndDrop>
    </Adw.ActionRow>
  )
}
