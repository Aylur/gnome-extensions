import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { AppPickerSchema, PickerSchema, useSettings } from "~schemas"
import { For } from "gnim"
import PickerRow from "./PickerRow"
import AddPickerButton from "./AddPickerButton"

export default function DefaultPickerGroup() {
  const { searchPickers, commands, setSearchPickers, showHiddenOptions } = useSettings()
  const isOverriden = commands((cmds) => cmds.some((p) => p.id === "default"))

  function swap(a: PickerSchema, b: PickerSchema) {
    const aIndex = searchPickers.get().findIndex((p) => p.is(a))
    const bIndex = searchPickers.get().findIndex((p) => p.is(b))

    setSearchPickers((prev) => {
      return prev.map((p, i) => (i === aIndex ? b.dict : i === bIndex ? a.dict : p))
    })
  }

  function change(picker: PickerSchema, index: number) {
    setSearchPickers((prev) => prev.map((p, i) => (i === index ? picker.dict : p)))
  }

  function remove(index: number) {
    setSearchPickers((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Adw.PreferencesGroup
      title={_("Default Picker")}
      sensitive={isOverriden((x) => !x)}
      description={isOverriden((o) =>
        o ? _("Default picker is overriden by a custom command") : "",
      )}
    >
      <AddPickerButton
        $type="header-suffix"
        pickerList={searchPickers}
        onAddPicker={(schema) => setSearchPickers((prev) => [...prev, schema.dict])}
      />
      <For each={searchPickers}>
        {(picker, index) => (
          <PickerRow
            schema={picker}
            swappable={searchPickers((s) => s.length > 1)}
            onSwap={swap}
            onChange={(picker) => change(picker, index.get())}
            onRemove={() => remove(index.get())}
            removable={showHiddenOptions(
              (s) => s || !(picker instanceof AppPickerSchema),
            )}
          />
        )}
      </For>
      <Gtk.Label
        css="font-weight:bold;"
        visible={searchPickers((l) => l.length === 0)}
        label={_("There are no pickers set")}
        halign={Gtk.Align.CENTER}
      />
    </Adw.PreferencesGroup>
  )
}
