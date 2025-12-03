import GLib from "gi://GLib"
import { Service, iface, methodAsync } from "gnim/dbus"

const DOMAIN = "org.gnome.Shell.Extensions.GnomeEval"

@iface(DOMAIN)
export default class Eval extends Service {
  modulesLoaded = new Set<string>()

  @methodAsync(["s"], ["s"])
  async Eval(code: string): Promise<[string]> {
    const fn = Function(`return (async function() {
      ${code.includes(";") ? code : `return ${code};`}
    })`)

    const res = await (fn() as () => Promise<unknown>)()
    return [`${res}`]
  }

  @methodAsync(["s"], ["s"])
  async RunModule(file: string): Promise<[string]> {
    if (!GLib.path_is_absolute(file)) {
      throw Error("file has to be an absolute path")
    }
    if (this.modulesLoaded.has(file)) {
      throw Error("module has been already loaded")
    }

    const mod = await import(`file://${file}`)

    if ("default" in mod && typeof mod.default === "function") {
      const out = mod.default()
      if (out instanceof Promise) {
        return [`${await out}`]
      } else {
        return [out]
      }
    }

    return ["undefined"]
  }
}
