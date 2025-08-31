import Gio from "gi://Gio"
import GLib from "gi://GLib"
import Clutter from "gi://Clutter"
import St from "gi://St"
import { createBinding, createComputed, With } from "gnim"
import { useSettings } from "~schemas"
import PanelButton from "./widgets/PanelButton"
import { useGnofi } from "./Gnofi"
import { useExtension } from "./extenstion"
import { useEffect } from "gnim-hooks"

export default function GnofiPanelButton() {
  const { panelButton } = useSettings()
  const { gnofi } = useGnofi()
  const { uuid } = useExtension()

  const visible = panelButton(([visible]) => visible)
  const position = panelButton(([, position]) => position)
  const index = panelButton(([, , index]) => index)
  const icon = panelButton(([, , , icon]) => icon)
  const label = panelButton(([, , , , label]) => label)

  // this way the button is only recreated when needed
  const buttonProps = createComputed([visible, position, index])

  const gicon = icon((icon) =>
    GLib.file_test(icon, GLib.FileTest.EXISTS)
      ? Gio.FileIcon.new(Gio.File.new_for_path(icon))
      : Gio.Icon.new_for_string(icon || "system-search-symbolic"),
  )

  const contentProps = createComputed([icon, gicon, label])

  function init(self: St.Widget) {
    useEffect((get) => {
      if (get(createBinding(gnofi, "isOpen"))) {
        self.add_style_pseudo_class("active")
      } else {
        self.remove_style_pseudo_class("active")
      }
    })
  }

  return (
    <With value={buttonProps}>
      {([visible, position, index]) =>
        visible && (
          <PanelButton
            $={init}
            id={uuid}
            panelposition={position}
            index={index}
            name="Gnofi"
            onPrimaryClicked={() => (gnofi.open(""), Clutter.EVENT_STOP)}
            onSecondaryClicked={() => (gnofi.open(""), Clutter.EVENT_STOP)}
          >
            <St.Bin>
              <With value={contentProps}>
                {([icon, gicon, label]) => (
                  <St.BoxLayout style="padding: 0 2px;">
                    {icon && <St.Icon iconSize={16} gicon={gicon} />}
                    {icon && label && <St.Bin style="margin: 0 .2em;" />}
                    {label && (
                      <St.Label
                        yAlign={Clutter.ActorAlign.CENTER}
                        text={label}
                        opacity={228}
                      />
                    )}
                  </St.BoxLayout>
                )}
              </With>
            </St.Bin>
          </PanelButton>
        )
      }
    </With>
  )
}
