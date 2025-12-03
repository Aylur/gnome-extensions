import type Adw from "gi://Adw"
import { createContext } from "gnim"

type PrefsProps = {
  window: Adw.PreferencesWindow
  uuid: string
}

export const PrefsContext = createContext<PrefsProps | null>(null)

export function usePrefs() {
  const props = PrefsContext.use()
  if (!props) throw Error("usePrefs used outside of a PrefsContext")
  return props
}
