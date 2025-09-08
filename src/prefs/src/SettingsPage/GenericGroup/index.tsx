import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import HotkeyRow from "./HotkeyRow"
import { useSettings } from "~schemas"

export default function GenericGroup() {
  const settings = useSettings()

  return (
    <Adw.PreferencesGroup title={t("Generic Settings")}>
      <HotkeyRow
        title={t("Hotkey")}
        subtitle={t("Hotkey that opens the picker window")}
        hotkey={settings.windowHotkey}
        onChange={settings.setWindowHotkey}
      />
      <Adw.SpinRow
        title={t("Margin Top")}
        subtitle={t("The distance between the top of the screen and the picker window")}
        value={settings.windowMarginTop}
        onNotifyValue={({ value }) => settings.setWindowMarginTop(Math.floor(value))}
        $constructor={() => Adw.SpinRow.new_with_range(0, 1000, 5)}
      />
      <Adw.SpinRow
        title={t("Width")}
        subtitle={t("The width of the picker window")}
        value={settings.windowWidth}
        onNotifyValue={({ value }) => settings.setWindowWidth(Math.floor(value))}
        $constructor={() => Adw.SpinRow.new_with_range(200, 1400, 5)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={t("Visible Command")}
        subtitle={t("Whether the command is visible in the text entry")}
        active={settings.visibleCommand}
        onNotifyActive={({ active }) => settings.setVisibleCommand(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={t("Focusable Entry")}
        subtitle={t("Whether the search entry can be focused via keyboard navigation")}
        active={settings.focusableEntry}
        onNotifyActive={({ active }) => settings.setFocusableEntry(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={t("Close Overview")}
        subtitle={t("Whether to also close the overview when closing the picker")}
        active={settings.closeOverview}
        onNotifyActive={({ active }) => settings.setCloseOverview(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={t("Replace Overview Search")}
        subtitle={t("Hide the overview search entry and use picker instead")}
        active={settings.replaceOverviewSearch}
        onNotifyActive={({ active }) => settings.setReplaceOverviewSearch(active)}
      />
      <Adw.SwitchRow
        visible={settings.showHiddenOptions}
        title={t("Open on Startup")}
        subtitle={t("Open the picker immediately after logging in")}
        active={settings.openAtStartup}
        onNotifyActive={({ active }) => settings.setOpenAtStartup(active)}
      />
      <Adw.EntryRow
        visible={settings.showHiddenOptions}
        title={t("Command Leader")}
        maxLength={1}
        text={settings.commandLeader}
        onNotifyText={({ text }) => settings.setCommandLeader(text || ":")}
      />
    </Adw.PreferencesGroup>
  )
}
