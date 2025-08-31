import { Extension } from "resource:///org/gnome/shell/extensions/extension.js"
import { createContext } from "gnim"

const ExtensionContext = createContext<Extension | null>(null)

export function ExtensionProvider<T>(props: Extension, children: () => T) {
  return ExtensionContext.provide(props, children)
}

export function useExtension() {
  const ctx = ExtensionContext.use()
  if (!ctx) throw Error("missing ExtensionContext")
  return ctx
}
