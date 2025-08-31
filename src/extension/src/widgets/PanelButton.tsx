import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js"
import St from "gi://St"
import Clutter from "gi://Clutter"
import { register, signal } from "gnim/gobject"
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js"
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js"
import * as Main from "resource:///org/gnome/shell/ui/main.js"
import { PanelButtonPosition } from "~schemas"
import { onMount } from "gnim"

interface PanelButtonProps extends St.Widget.ConstructorProps {
  id: string
  panelposition: PanelButtonPosition
  index: number
  alignment: number
  name: string
}

@register()
export default class PanelButton extends PanelMenu.Button {
  declare $signals: St.Widget.SignalSignatures & {
    "primary-clicked": () => boolean
    "secondary-clicked": () => boolean
  }

  static PopupContent =
    @register()
    class PanelButtonPopupContent extends St.Bin {}

  @signal([], Boolean, { default: false })
  primaryClicked(): boolean {
    return false
  }

  @signal([], Boolean, { default: false })
  secondaryClicked(): boolean {
    return false
  }

  readonly id: string
  private readonly _position: PanelButtonPosition
  private readonly _index: number

  constructor({
    id,
    panelposition = PanelButtonPosition.RIGHT,
    index = 0,
    alignment = 0.5,
    name = "",
    ...props
  }: Partial<PanelButtonProps>) {
    super(alignment, name, false)
    if (!id) throw Error(_("PanelButton is required to have an 'id'"))
    this.id = id
    this._position = panelposition
    this._index = index
    Object.assign(this, props)

    onMount(() => {
      const pos = ["left", "center", "right"][this._position] ?? "left"
      Main.panel.addToStatusArea(this.id, this, this._index, pos)
    })
  }

  add_child(child: Clutter.Actor): void {
    if (this.menu instanceof PopupMenu.PopupMenu && child instanceof PopupMenu.PopupBaseMenuItem) {
      this.menu.addMenuItem(child)
    } else if (
      this.menu instanceof PopupMenu.PopupMenu &&
      child instanceof PanelButton.PopupContent
    ) {
      this.menu.box.add_child(child)
    } else {
      super.add_child(child)
    }
  }

  vfunc_event(event: Clutter.Event) {
    if (event.type() === Clutter.EventType.BUTTON_PRESS) {
      if (event.get_button() === Clutter.BUTTON_PRIMARY && this.primaryClicked()) {
        return Clutter.EVENT_STOP
      }
      if (event.get_button() === Clutter.BUTTON_SECONDARY && this.secondaryClicked()) {
        return Clutter.EVENT_STOP
      }
    }

    return super.vfunc_event(event)
  }
}
