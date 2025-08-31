import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { createRoot, createState } from "gnim"
import { PickerSchema } from "~schemas"
import EntryRow from "#/EntryRow"

export default function AddCommandDialog(props: {
  window: Adw.Window
  onCancel: () => void
  onAdd: (schema: PickerSchema) => void
}) {
  let dialog: Adw.Dialog
  const [command, setCommand] = createState("")
  const [missing, setMissing] = createState(false)
  const [description, setDiscription] = createState("")

  function init(self: Adw.Dialog) {
    dialog = self
    dialog.present(props.window)
  }

  function save() {
    if (command.get()) {
      props.onAdd(new PickerSchema({ name: description.get(), id: command.get() }))
      dialog.close()
    } else {
      setMissing(true)
    }
  }

  return createRoot((dispose) => (
    <Adw.Dialog
      title={_("New Command")}
      onClosed={dispose}
      onCloseAttempt={props.onCancel}
      widthRequest={400}
      $={init}
    >
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top">
          <Gtk.Button
            class="suggested-action"
            tooltipText={command((c) => (c ? "" : _("Command is required")))}
            sensitive={command(Boolean)}
            onClicked={save}
          >
            {_("Add")}
          </Gtk.Button>
        </Adw.HeaderBar>
        <Adw.PreferencesGroup marginEnd={12} marginStart={12} marginBottom={12}>
          <EntryRow
            title={missing((m) => (m ? _("Command is required") : _("Command")))}
            state={missing((m) => (m ? "error" : "none"))}
            explanation={_("The command used to invoke this provider")}
            onNotifyText={({ text }) => {
              setCommand(text)
              setMissing(false)
            }}
            onEntryActivated={save}
          />
          <EntryRow
            title={_("Description")}
            explanation={_("Optional description shown in the picker command list")}
            onNotifyText={({ text }) => setDiscription(text)}
            onEntryActivated={save}
          />
        </Adw.PreferencesGroup>
      </Adw.ToolbarView>
    </Adw.Dialog>
  ))
}
