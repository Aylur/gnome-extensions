import St from "gi://St"
import Clutter from "gi://Clutter"
import { $ } from "gnim-hooks"

export default function Separator(props: { css?: $<string>; visible?: $<boolean> }) {
  return (
    <St.Bin
      xExpand
      css={props.css}
      visible={props.visible}
      class="popup-separator-menu-item"
      yAlign={Clutter.ActorAlign.CENTER}
    >
      <St.Widget xExpand class="popup-separator-menu-item-separator" />
    </St.Bin>
  )
}
