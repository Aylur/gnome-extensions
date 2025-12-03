import Gio from "gi://Gio"
import { extensionSchema } from "./gschema"
import { createSettings } from "gnim-schemas"
import { createContext } from "gnim"

export function createExtensionSettings(settings: Gio.Settings) {
  return createSettings(settings, extensionSchema)
}

type Settings = ReturnType<typeof createExtensionSettings>

export const SettingsContext = createContext<Settings | null>(null)

export function useSettings() {
  const settings = SettingsContext.use()
  if (!settings) throw Error("settings not in scope")
  return settings
}
