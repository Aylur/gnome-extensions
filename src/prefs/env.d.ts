import "@girs/adw-1"
import "@girs/gjs"
import "@girs/gjs/dom"
import "@girs/gnome-shell/ambient"
import "@girs/gtksource-5"
import type { Root } from "mdast"

declare module "*.txt" {
  const content: string
  export default content
}

declare global {
  interface ImportMeta {
    DEVEL: boolean
    VERSION: string

    EMAIL_API: string
    GIT_URL: string
    BUGS_URL: string
    EXAMPLES_URL: string
    DONATORS_LIST_URL: string
    DOCS_URL: string

    IPC_DOC: Root
  }

  interface String {
    toUpperCase<T extends string>(this: T): Uppercase<T>
    toLowerCase<T extends string>(this: T): Lowercase<T>
  }
}
