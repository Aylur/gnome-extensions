import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { AppPickerSchema, SearchPickerSchema, PickerSchema, useSettings } from "~schemas"
import { Accessor, onCleanup, With } from "gnim"
import { usePrefs } from "#/prefs"
import ExternalPickerDialog from "./ExternalPickerDialog"
import SearchProviderListDialog from "./SearchProviderListDialog"

export default function AddPickerButton(props: {
  onPreAddPicker?(): Promise<PickerSchema>
  onAddPicker(schema: PickerSchema): void
  pickerList: Accessor<Array<PickerSchema>>
}) {
  let popover: Gtk.Popover | null = null
  const { showHiddenOptions } = useSettings()
  const { window } = usePrefs()
  const { onPreAddPicker = () => Promise.resolve(null) } = props

  const hasAppPicker = props.pickerList((list) =>
    list.some((p) => p instanceof AppPickerSchema),
  )

  function initPopover(self: Gtk.Popover) {
    popover = self
    onCleanup(() => (popover = null))
  }

  function addProvider() {
    popover?.popdown()
    onPreAddPicker()
      .then((schema) => {
        SearchProviderListDialog({
          window,
          onSelect: (provider) => {
            props.onAddPicker(
              schema
                ? provider.copy({ id: schema.id, name: schema.name || provider.name })
                : provider,
            )
          },
          filter: (provider) =>
            !props.pickerList
              .peek()
              .some(
                (p) =>
                  p instanceof SearchPickerSchema &&
                  p.desktopId === provider.desktopId &&
                  p.objectPath === provider.objectPath &&
                  p.busName === provider.busName,
              ),
        })
      })
      .catch(() => void 0)
  }

  function addExternal() {
    popover?.popdown()
    onPreAddPicker()
      .then((schema) => {
        ExternalPickerDialog({
          window,
          title: t("Add new IPC Picker"),
          onSave: (external) =>
            props.onAddPicker(
              schema
                ? external.copy({ id: schema.id, name: schema.name || external.name })
                : external,
            ),
        })
      })
      .catch(() => void 0)
  }

  function addAppPicker() {
    popover?.popdown()
    onPreAddPicker()
      .then((schema) => {
        const app = AppPickerSchema.new({ name: t("Search applications") })
        props.onAddPicker(
          schema ? app.copy({ id: schema.id, name: schema.name || app.name }) : app,
        )
      })
      .catch(() => void 0)
  }

  return (
    <Adw.Bin>
      <With value={showHiddenOptions}>
        {(show) =>
          show ? (
            <Gtk.MenuButton>
              <Adw.ButtonContent iconName="list-add-symbolic" label={t("Add Picker")} />
              <Gtk.Popover $={initPopover}>
                <Gtk.Box orientation={Gtk.Orientation.VERTICAL}>
                  <Gtk.Button class="flat" onClicked={addProvider}>
                    <Gtk.Box spacing={4}>
                      <Gtk.Image iconName="system-search-symbolic" />
                      <Gtk.Label label={t("Search Provider")} />
                    </Gtk.Box>
                  </Gtk.Button>
                  <Gtk.Button class="flat" onClicked={addExternal}>
                    <Gtk.Box spacing={4}>
                      <Gtk.Image iconName="application-x-executable-symbolic" />
                      <Gtk.Label label={t("External IPC plugin")} />
                    </Gtk.Box>
                  </Gtk.Button>
                  <Gtk.Button
                    class="flat"
                    onClicked={addAppPicker}
                    visible={hasAppPicker((a) => !a)}
                  >
                    <Gtk.Box spacing={4}>
                      <Gtk.Image iconName="system-search-symbolic" />
                      <Gtk.Label label={t("App Picker")} />
                    </Gtk.Box>
                  </Gtk.Button>
                </Gtk.Box>
              </Gtk.Popover>
            </Gtk.MenuButton>
          ) : (
            <Gtk.Button onClicked={addProvider}>
              <Adw.ButtonContent
                iconName="list-add-symbolic"
                label={t("Add Search Provider")}
              />
            </Gtk.Button>
          )
        }
      </With>
    </Adw.Bin>
  )
}
