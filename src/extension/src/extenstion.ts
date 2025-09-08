import { createContext } from "gnim"

export type ExtensionProps = {
  openPreferences(): void
  uuid: string
  gettext(msgid: string): string
  ngettext(msgid1: string, msgid2: string, n: number): string
  pgettext(msgctxt: string, msgid: string): string
}

const ExtensionContext = createContext<ExtensionProps | null>(null)

export function ExtensionProvider<T>(props: ExtensionProps, children: () => T) {
  return ExtensionContext.provide(props, children)
}

export function useExtension() {
  const ctx = ExtensionContext.use()
  if (!ctx) throw Error("missing ExtensionContext")
  return ctx
}
