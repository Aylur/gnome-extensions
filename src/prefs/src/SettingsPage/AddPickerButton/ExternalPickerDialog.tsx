import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { createRoot, createState } from "gnim"
import { ExternalPickerSchema } from "~schemas"
import EntryRow from "#/EntryRow"

export default function ExternalPickerDialog(props: {
  window: Adw.Window
  title?: string
  schema?: ExternalPickerSchema
  onSave: (schema: ExternalPickerSchema) => void
}) {
  let dialog: Adw.Dialog

  const [schema, setSchema] = createState(
    props.schema || ExternalPickerSchema.new({ type: "persistent" }),
  )

  const [nameMissing, setNameMissing] = createState(false)
  const [exeMissing, setExeMissing] = createState(false)
  const isValid = schema((s) => s.name !== "" && s.executable !== "")

  function init(self: Adw.Dialog) {
    dialog = self
    self.present(props.window)
  }

  function save() {
    if (isValid.get()) {
      props.onSave(schema.get())
      dialog.close()
      return
    }

    setNameMissing(schema.get().name === "")
    setExeMissing(schema.get().executable === "")
  }

  return createRoot((dispose) => (
    <Adw.Dialog $={init} onClosed={dispose} contentWidth={400} title={props.title}>
      <Adw.ToolbarView>
        <Adw.HeaderBar $type="top">
          <Gtk.Button
            class="suggested-action"
            tooltipText={isValid((v) => (v ? "" : t("Fill in the form")))}
            sensitive={isValid}
            onClicked={save}
          >
            {t("Save")}
          </Gtk.Button>
        </Adw.HeaderBar>
        <Adw.PreferencesGroup marginEnd={12} marginStart={12} marginBottom={12}>
          <Adw.ActionRow title={t("Type")}>
            <Adw.ToggleGroup
              class="flat"
              valign={Gtk.Align.CENTER}
              activeName={schema((s) => s.type)}
              onNotifyActiveName={({ activeName }) =>
                setSchema((s) =>
                  s.copy({ type: activeName as "persistent" | "transient" }),
                )
              }
            >
              <Adw.Toggle label={t("Transient")} name="transient" />
              <Adw.Toggle label={t("Persistent")} name="persistent" />
            </Adw.ToggleGroup>
          </Adw.ActionRow>
          <EntryRow
            title={nameMissing((m) => (m ? t("Name is required") : t("Display Name")))}
            state={nameMissing((m) => (m ? "error" : "none"))}
            explanation={t(
              "This property is only used for displaying purposes and has no runtime effect.",
            )}
            onNotifyText={({ text }) => {
              setSchema((s) => s.copy({ name: text }))
              setNameMissing(false)
            }}
            onEntryActivated={save}
          />
          <EntryRow
            title={exeMissing((m) => (m ? t("Executable is required") : t("Executable")))}
            state={exeMissing((m) => (m ? "error" : "none"))}
            explanation={t(
              'If you need a shell environment to run the command - for example, if you need to use environment variables - make sure to use a shell:\n<b><tt>bash -c "your-command $var"</tt></b>',
            )}
            onNotifyText={({ text }) => {
              setSchema((s) => s.copy({ executable: text }))
              setExeMissing(false)
            }}
            onEntryActivated={save}
          />
        </Adw.PreferencesGroup>
      </Adw.ToolbarView>
    </Adw.Dialog>
  ))
}
