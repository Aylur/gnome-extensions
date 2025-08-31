import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { PanelButtonPosition, useSettings } from "~schemas"
import { traverseWidgetTree } from "#/utils"
import IconPickerDialog from "./IconPickerDialog"
import { usePrefs } from "#/prefs"
import { Accessed, getScope } from "gnim"
import { css } from "gnim-hooks/gtk4"

void css`
  row.combo.spin spinbutton text {
    min-width: 0;
  }
`

export default function PanelButtonGroup() {
  const scope = getScope()
  const settings = useSettings()
  const { window } = usePrefs()
  type Opts = Accessed<typeof opts>

  const opts = settings.panelButton(([visible, position, index, icon, label]) => ({
    visible,
    position,
    index,
    icon,
    label,
  }))

  function set<K extends keyof Opts>(key: K, value: Opts[K]) {
    const values = { ...opts.get(), [key]: value }
    const { visible, position, index, icon, label } = values
    settings.setPanelButton([visible, position, index, icon, label])
  }

  function searchIcons() {
    scope.run(() => IconPickerDialog({ window, onPicked: (name) => set("icon", name) }))
  }

  function pickIcon() {
    const filter = new Gtk.FileFilter()
    filter.add_mime_type("image/*")

    const dialog = new Gtk.FileDialog({
      title: _("Choose Image"),
      defaultFilter: filter,
    })

    dialog.open(window, null, (_, res) => {
      try {
        const file = dialog.open_finish(res)
        const path = file?.get_path()
        if (path) set("icon", path)
      } catch (error) {
        console.error(error)
      }
    })
  }

  const { LEFT, MIDDLE, RIGHT } = PanelButtonPosition

  const positionLabels = {
    [LEFT]: _("Left"),
    [MIDDLE]: _("Middle"),
    [RIGHT]: _("Right"),
  }

  return (
    <Adw.PreferencesGroup title={_("Panel Button Settings")}>
      <Adw.ExpanderRow
        title={_("Enable Panel Button")}
        subtitle={opts.as(({ label, icon, visible }) =>
          visible
            ? !label && !icon
              ? _("Leaving label and icon will result in an empty button")
              : ""
            : "",
        )}
        expanded={opts.as(({ visible }) => visible)}
        onNotifyExpanded={({ expanded }) => set("visible", expanded)}
        $={(self) => {
          let done = false
          traverseWidgetTree(self, (w) => {
            if (w instanceof Gtk.Label && w.cssClasses.includes("subtitle") && !done) {
              done = (w.add_css_class("warning"), true)
            }
          })
        }}
      >
        <Gtk.Switch
          $type="suffix"
          valign={Gtk.Align.CENTER}
          active={opts.as(({ visible }) => visible)}
          onNotifyActive={({ active }) => set("visible", active)}
        />
        <Adw.ActionRow
          class="property"
          title={_("Icon")}
          subtitle={opts.as(({ icon }) => icon)}
        >
          <Gtk.Button
            visible={opts.as(({ icon }) => !!icon)}
            class="destructive-action flat"
            iconName="edit-clear-symbolic"
            valign={Gtk.Align.CENTER}
            tooltipText={_("Remove icon")}
            onClicked={() => set("icon", "")}
          />
          <Gtk.Button
            class="flat"
            valign={Gtk.Align.CENTER}
            iconName="folder-symbolic"
            tooltipText={_("Pick an image file")}
            onClicked={pickIcon}
          />
          <Gtk.Button
            class="flat"
            tooltipText={_("Pick a named icon")}
            valign={Gtk.Align.CENTER}
            iconName="view-list-bullet-symbolic"
            onClicked={searchIcons}
          />
        </Adw.ActionRow>
        <Adw.EntryRow
          visible={settings.showHiddenOptions}
          title={_("Label")}
          text={opts.get().label}
          onNotifyText={({ text }) => set("label", text)}
        />
        <Adw.ComboRow
          visible={settings.showHiddenOptions}
          title={_("Position")}
          class="combo spin"
          model={Gtk.StringList.new(Object.values(positionLabels))}
          selected={opts.as(({ position }) => position)}
          onNotifySelected={({ selected }) => set("position", selected)}
        >
          <Gtk.Separator
            $type="suffix"
            marginTop={8}
            marginBottom={8}
            marginStart={12}
            marginEnd={12}
            orientation={Gtk.Orientation.VERTICAL}
          />
          <Gtk.SpinButton $type="suffix" valign={Gtk.Align.CENTER}>
            <Gtk.Adjustment
              lower={0}
              upper={16}
              pageIncrement={1}
              stepIncrement={1}
              value={opts.as(({ index }) => index)}
              onNotifyValue={({ value }) => set("index", value)}
            />
          </Gtk.SpinButton>
        </Adw.ComboRow>
      </Adw.ExpanderRow>
    </Adw.PreferencesGroup>
  )
}
