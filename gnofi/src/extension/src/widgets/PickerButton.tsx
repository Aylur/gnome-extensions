import St from "gi://St"
import Clutter from "gi://Clutter"
import Gio from "gi://Gio"
import { createMemo, Node, With } from "gnim"
import { useGnofi } from "#/Gnofi"
import { LabelLayout } from "~schemas"
import { $ } from "gnim-hooks"

export default function PickerButton(props: {
  onClick: () => void
  xExpand?: $<boolean>
  yExpand?: $<boolean>
  icon?: $<Gio.Icon | null>
  iconName?: $<string>
  name?: $<string>
  description?: $<string | null>
  iconSize?: $<number>
  padding?: $<number | number[]>
  labelLayout?: $<LabelLayout>
  vertical?: $<boolean>
  children?: Node
}) {
  const { gnofi } = useGnofi()
  const name = $(props.name ?? "")
  const gicon = $(props.icon ?? null)
  const iconName = $(props.iconName)
  const description = $(props.description, (v) => v || "")
  const iconSize = $(props.iconSize ?? 12)
  const padding = $(props.padding ?? 5)
  const labelLayout = $(props.labelLayout ?? LabelLayout.BOTH)
  const vertical = $(props.vertical ?? false)
  const icon = createMemo(() => [gicon(), iconName()] as const)

  return (
    <St.Button
      xExpand={$(props.xExpand, (v) => v ?? true)}
      yExpand={$(props.yExpand, (v) => v ?? true)}
      canFocus
      class="gnofi-picker-button popup-menu-item"
      onKeyPressEvent={(_, event) =>
        gnofi.keypress({
          focusedEntry: false,
          controlMod: event.has_control_modifier(),
          key: event.get_key_symbol(),
        })
      }
      onKeyFocusIn={(self) => self.add_style_pseudo_class("selected")}
      onKeyFocusOut={(self) => self.remove_style_pseudo_class("selected")}
      onClicked={props.onClick}
      onButtonPressEvent={props.onClick}
      css={padding((p) =>
        Array.isArray(p)
          ? `padding: ${p.map((p) => `${p}px`).join(" ")}`
          : `padding:${p}px`,
      )}
    >
      <St.BoxLayout xExpand vertical={vertical}>
        <St.Bin>
          <With value={icon}>
            {([gicon, iconName]) =>
              (gicon || iconName) && (
                <St.Icon
                  xAlign={Clutter.ActorAlign.CENTER}
                  xExpand={labelLayout((l) => l === LabelLayout.NONE)}
                  iconSize={iconSize}
                  css="margin-right:0.2em"
                  {...{
                    ...(gicon && { gicon }),
                    ...(iconName && { iconName }),
                  }}
                />
              )
            }
          </With>
        </St.Bin>
        {props.children}
        <With value={labelLayout}>
          {(layout) => (
            <St.BoxLayout
              visible={createMemo(() => !!(name() || description()))}
              xExpand
              xAlign={vertical((v) =>
                v ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START,
              )}
              yAlign={Clutter.ActorAlign.CENTER}
              vertical={layout !== LabelLayout.BOTH_INLINE}
            >
              {(layout === LabelLayout.BOTH_INLINE ||
                layout === LabelLayout.BOTH ||
                layout === LabelLayout.NAME) && (
                <St.Label
                  xExpand
                  xAlign={vertical((v) =>
                    v ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START,
                  )}
                  text={name}
                  css="font-weight:bold"
                />
              )}
              {(layout === LabelLayout.BOTH_INLINE ||
                layout === LabelLayout.BOTH ||
                layout === LabelLayout.DESCRIPTION) && (
                <St.Label
                  visible={description(Boolean)}
                  xExpand
                  xAlign={vertical((v) =>
                    v ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START,
                  )}
                  text={description}
                  opacity={170}
                  css={layout === LabelLayout.BOTH_INLINE ? "margin-left: 8px" : ""}
                />
              )}
            </St.BoxLayout>
          )}
        </With>
      </St.BoxLayout>
    </St.Button>
  )
}
