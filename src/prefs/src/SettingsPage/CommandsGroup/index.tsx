import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { PickerSchema, useSettings } from "~schemas"
import { For } from "gnim"
import PickerRow from "../PickerRow"
import AddPickerButton from "../AddPickerButton"
import AddCommandDialog from "./AddCommandDialog"
import { usePrefs } from "#/prefs"

export default function CommandsGroup() {
  const { window } = usePrefs()
  const { commands, setCommands } = useSettings()

  async function preAdd(): Promise<PickerSchema> {
    return new Promise((resolve, reject) => {
      AddCommandDialog({
        window,
        onAdd: resolve,
        onCancel: reject,
      })
    })
  }

  function change(schema: PickerSchema) {
    setCommands((prev) => {
      const next = { ...prev }
      next[schema.id] = schema.dict
      return next
    })
  }

  function remove({ id }: PickerSchema) {
    setCommands((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function swap(a: PickerSchema, b: PickerSchema) {
    setCommands((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, schema]) => [
          id === a.id ? b.id : id === b.id ? a.id : id,
          id === a.id ? b.dict : id === b.id ? a.dict : schema,
        ]),
      ),
    )
  }

  return (
    <Adw.PreferencesGroup title={_("Commands")}>
      <AddPickerButton
        $type="header-suffix"
        onPreAddPicker={preAdd}
        pickerList={commands}
        onAddPicker={(schema) =>
          setCommands((prev) => ({
            ...prev,
            [schema.id]: schema.dict,
          }))
        }
      />
      <For each={commands}>
        {(schema) => (
          <PickerRow
            command
            schema={schema}
            onChange={change}
            onRemove={() => remove(schema)}
            onSwap={swap}
            swappable={commands((c) => c.length > 1)}
          />
        )}
      </For>
      <Adw.PreferencesRow sensitive={false} visible={commands((c) => c.length === 0)}>
        <Gtk.Label
          marginTop={14}
          marginBottom={14}
          halign={Gtk.Align.CENTER}
          label={_("No commands added yet")}
        />
      </Adw.PreferencesRow>
    </Adw.PreferencesGroup>
  )
}
