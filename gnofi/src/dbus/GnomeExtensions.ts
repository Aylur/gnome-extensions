import { Service, Variant, iface, methodAsync, signal } from "gnim/dbus"

type dict = Record<string, Variant<any>>

@iface(`org.gnome.Shell.Extensions`)
export default class GnomeExtensions extends Service {
  static proxy() {
    return new GnomeExtensions().proxy({
      name: "org.gnome.Shell",
      objectPath: "/org/gnome/Shell",
    })
  }

  @signal("s", "a{sv}")
  protected ExtensionStateChanged(uuid: string, state: dict) {
    void [uuid, state]
  }

  @signal("s", "i", "s")
  protected ExtensionStatusChanged(uuid: string, state: number, error: string) {
    void [uuid, state, error]
  }

  @methodAsync(["s"], ["a{sv}"])
  async GetExtensionInfo(uuid: string): Promise<[dict]> {
    return Promise.reject(uuid)
  }

  @methodAsync(["s"], ["b"])
  async EnableExtension(uuid: string): Promise<[boolean]> {
    return Promise.reject(uuid)
  }

  @methodAsync(["s"], ["b"])
  async DisableExtension(uuid: string): Promise<[boolean]> {
    return Promise.reject(uuid)
  }
}
