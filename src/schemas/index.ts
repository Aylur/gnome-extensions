import type Gio from "gi://Gio"
import { Accessor, createContext, createSettings } from "gnim"
import { createSchema } from "./schema"

export * from "./schema"

const SettingsContext = createContext<null | Settings>(null)

export type Settings = ReturnType<typeof createExtensionSettings>

export function useSettings() {
  const settings = SettingsContext.use()
  if (!settings) throw Error("missing SettingsContext")
  return settings
}

function createExtensionSettings(settings: Gio.Settings) {
  const { panelButton, setPanelButton, commands, searchPickers, ...keys } =
    createSettings(settings, {
      "window-hotkey": "as",
      "window-margin-top": "u",
      "window-width": "u",
      "close-overview": "b",
      "replace-overview-search": "b",
      "open-at-startup": "b",
      "focusable-entry": "b",
      "visible-command": "b",
      "command-leader": "s",
      "search-delay": "u",
      "panel-button": "(buiss)",
      "save-logs-in-memory": "b",
      "show-hidden-options": "b",
      "commands": "a{sa{sv}}",
      "search-pickers": "aa{sv}",
      "preferences-page": "s",
      "initial-notification": "b",
    })

  return {
    settings,
    ...keys,
    panelButton: panelButton as Accessor<PanelButtonSchema>,
    setPanelButton: (v: PanelButtonSchema) => setPanelButton(v),
    searchPickers: searchPickers((arr) => arr.map(createSchema)),
    commands: commands((dict) =>
      Object.entries(dict).map(([command, dict]) =>
        createSchema(dict).copy({ id: command }),
      ),
    ),
  }
}

export function SettingsProvider<T>(settings: Gio.Settings, children: () => T) {
  return SettingsContext.provide(createExtensionSettings(settings), children)
}

export enum PanelButtonPosition {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

export type PanelButtonSchema = [
  visible: boolean,
  position: PanelButtonPosition,
  index: number,
  icon: string,
  label: string,
]
