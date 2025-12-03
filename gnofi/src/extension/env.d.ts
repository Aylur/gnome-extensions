import "@girs/gjs"
import "@girs/gjs/dom"
import "@girs/gnome-shell/ambient"
import "@girs/gnome-shell/extensions/global"
import "@girs/girepository-2.0"

declare global {
  interface ImportMeta {
    DEVEL: string
    VERSION: string
  }
}

declare global {
  interface String {
    toUpperCase<T extends string>(this: T): Uppercase<T>
    toLowerCase<T extends string>(this: T): Lowercase<T>
  }
}
