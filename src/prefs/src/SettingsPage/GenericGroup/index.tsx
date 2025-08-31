import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import HotkeyRow from "./HotkeyRow"
import { useSettings } from "~schemas"

export default function GenericGroup() {
  const settings = useSettings()

  return (
    <Adw.PreferencesGroup title={_("Generic Settings")}>
      <HotkeyRow
        title={_("Hotkey")}
        subtitle={_("Hotkey that opens the picker window")}
        hotkey={settings.windowHotkey}
        onChange={settings.setWindowHotkey}
      />
      <Adw.SpinRow
        title={_("Margin Top")}
        subtitle={_("The distance between the top of the screen and the picker window")}
        value={settings.windowMarginTop}
        onNotifyValue={({ value }) => settings.setWindowMarginTop(Math.floor(value))}
        $constructor={() => Adw.SpinRow.new_with_range(0, 1000, 5)}
      />
      <Adw.SpinRow
        title={_("Width")}
        subtitle={_("The width of the picker window")}
        value={settings.windowWidth}
        onNotifyValue={({ value }) => settings.setWindowWidth(Math.floor(value))}
        $constructor={() => Adw.SpinRow.new_with_range(200, 1400, 5)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={_("Visible Command")}
        subtitle={_("Whether the command is visible in the text entry")}
        active={settings.visibleCommand}
        onNotifyActive={({ active }) => settings.setVisibleCommand(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={_("Focusable Entry")}
        subtitle={_("Whether the search entry can be focused via keyboard navigation")}
        active={settings.focusableEntry}
        onNotifyActive={({ active }) => settings.setFocusableEntry(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={_("Close Overview")}
        subtitle={_("Whether to also close the overview when closing the picker")}
        active={settings.closeOverview}
        onNotifyActive={({ active }) => settings.setCloseOverview(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={_("Replace Overview Search")}
        subtitle={_("Hide the overview search entry and use picker instead")}
        active={settings.replaceOverviewSearch}
        onNotifyActive={({ active }) => settings.setReplaceOverviewSearch(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={_("Open on Startup")}
        subtitle={_("Open the picker immediately after logging in")}
        active={settings.openAtStartup}
        onNotifyActive={({ active }) => settings.setOpenAtStartup(active)}
      />
      <Adw.EntryRow
        visible={settings.showHiddenOptions}
        title={_("Command Leader")}
        maxLength={1}
        text={settings.commandLeader}
        onNotifyText={({ text }) => settings.setCommandLeader(text || ":")}
      />
    </Adw.PreferencesGroup>
  )
}
