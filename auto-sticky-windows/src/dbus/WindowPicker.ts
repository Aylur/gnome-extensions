import { Service, methodAsync, iface } from "gnim/dbus"
import type Clutter from "gi://Clutter"

const DOMAIN = "org.gnome.Shell.Extensions.AutoAlwaysOnTop"

class WindowNotFound extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = `${DOMAIN}.Error.WindowNotFound`
  }
}

@iface(DOMAIN)
export default class WindowPicker extends Service {
  @methodAsync([], ["s"])
  async Pick(): Promise<[string]> {
    const { default: Meta } = await import("gi://Meta")
    const Main = await import("resource:///org/gnome/shell/ui/main.js")
    const { Inspector } = await import("resource:///org/gnome/shell/ui/lookingGlass.js")

    const lookingGlass = Main.createLookingGlass()
    const inspector = new Inspector(lookingGlass)

    inspector.connect("closed", () => {
      lookingGlass.close()
    })

    return new Promise((resolve, reject) => {
      inspector.connect("target", (_: typeof Inspector, target: Clutter.Actor) => {
        // Remove the red border effect when the window is picked.
        for (const effect of target.get_effects()) {
          if (effect.toString().includes("lookingGlass_RedBorderEffect")) {
            target.remove_effect(effect)
          }
        }

        let actor: Clutter.Actor | null = target

        // If the picked actor is not a Meta.WindowActor, which happens
        // often since it's usually a Meta.SurfaceActor, try to find its
        // parent which is a Meta.WindowActor.
        for (let i = 0; i < 2; i++) {
          if (actor == null || actor instanceof Meta.WindowActor) {
            break
          }
          actor = actor.get_parent()
        }

        if (!(actor instanceof Meta.WindowActor)) {
          return reject(new WindowNotFound("Could not find Meta.WindowActor"))
        }

        const wmClass = actor.metaWindow.get_wm_class_instance()

        if (wmClass) {
          return resolve([wmClass])
        } else {
          return reject(new WindowNotFound("WM_CLASS of Meta.WindowActor is NULL"))
        }
      })
    })
  }
}
