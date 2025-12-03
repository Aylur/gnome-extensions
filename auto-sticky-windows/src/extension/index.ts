import { Extension } from "resource:///org/gnome/shell/extensions/extension.js"
import { createExtensionSettings } from "~schemas"
import WindowPicker from "~dbus/WindowPicker"

export default class AutoAlwaysOnTop extends Extension {
  declare private handler: number
  declare private windowPicker?: WindowPicker

  disable() {
    global.display.disconnect(this.handler)
    this.windowPicker?.stop()
    delete this.windowPicker
  }

  enable() {
    this.windowPicker = new WindowPicker()
    this.windowPicker.serve()

    const s = createExtensionSettings(this.getSettings())

    this.handler = global.display.connect("window-created", (_, w) => {
      const whiteMode = s.whitelistMode.peek()
      const list = whiteMode ? s.whitelist.peek() : s.blacklist.peek()

      const found = list.some((name) => name === w.wmClass)

      if ((whiteMode && found) || (!whiteMode && !found)) {
        w.make_above()
      }
    })
  }
}
