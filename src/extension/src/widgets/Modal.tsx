import St from "gi://St"
import Clutter from "gi://Clutter"
import { This } from "gnim"
import { getter, register, setter, signal } from "gnim/gobject"
import { layoutManager } from "resource:///org/gnome/shell/ui/main.js"
import { MonitorConstraint } from "resource:///org/gnome/shell/ui/layout.js"

const OPEN_AND_CLOSE_TIME = 100

interface ModalProps extends St.Bin.ConstructorProps {
  isOpen: boolean
}

@register()
export default class Modal extends St.Widget {
  declare $signals: St.Widget.SignalSignatures & {
    opened: Modal["opened"]
  }

  @signal() opened() {}

  @getter(Boolean) get isOpen() {
    return this.visible
  }

  @setter(Boolean) set isOpen(open: boolean) {
    if (open) this.open()
    else this.close()
  }

  private grab?: Clutter.Grab
  private monitorConstraint!: MonitorConstraint

  private focusActor?: Clutter.Actor
  private focusId?: number
  private focusDestroyId?: number

  set keyFocus(focus: Clutter.Actor) {
    if (this.focusId && this.focusActor && this.focusDestroyId) {
      this.focusActor.disconnect(this.focusId)
      this.focusActor.disconnect(this.focusDestroyId)
    }

    const focusId = (this.focusId = focus.connect("event", (_, event) => {
      this.emit("event", event)
    }))

    const focusDestroyId = (this.focusDestroyId = focus.connect("destroy", () => {
      focus.disconnect(focusId)
      focus.disconnect(focusDestroyId)
      delete this.focusActor
    }))

    this.focusActor = focus
  }

  destroy(): void {
    global.focus_manager.remove_group(this)
    layoutManager.removeChrome(this)
    super.destroy()
  }

  focus(target: "forward" | "backward" | "up" | "down" | "left" | "right") {
    const direction =
      target === "forward" || target === "backward"
        ? (`TAB_${target.toUpperCase()}` as const)
        : target.toUpperCase()

    this.navigate_focus(global.stage.key_focus, St.DirectionType[direction], true)
    this.keyFocus = global.stage.key_focus
  }

  open() {
    if (this.visible) return Promise.resolve(false)
    this.grab = global.stage.grab(this)

    this.monitorConstraint.index = global.display.get_current_monitor()
    this.opacity = 0
    this.visible = true

    // @ts-expect-error missing types
    this.ease({
      opacity: 255,
      duration: OPEN_AND_CLOSE_TIME,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => this.emit("opened"),
    })
  }

  close() {
    if (!this.visible) return
    this.grab?.dismiss()
    delete this.grab

    // @ts-expect-error missing types
    this.ease({
      opacity: 0,
      duration: OPEN_AND_CLOSE_TIME,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => this.hide(),
    })
  }

  constructor({ visible = false, ...props }: Partial<ModalProps>) {
    super({ ...props, visible, offscreenRedirect: Clutter.OffscreenRedirect.ALWAYS })

    function onKeyPressEvent(self: Modal, event: Clutter.Event) {
      if (event.get_key_symbol() === Clutter.KEY_Escape) {
        self.close()
      }
    }

    void (
      <This this={layoutManager.modalDialogGroup}>
        <This this={this as Modal} onKeyPressEvent={onKeyPressEvent}>
          <Clutter.BinLayout />
          <Clutter.BindConstraint source={global.stage} coordinate={Clutter.BindCoordinate.ALL} />
          <MonitorConstraint $={(m) => (this.monitorConstraint = m)} />
          <St.Widget
            xExpand
            yExpand
            reactive
            onButtonPressEvent={() => void (this.visible = false)}
          />
        </This>
      </This>
    )
  }
}
