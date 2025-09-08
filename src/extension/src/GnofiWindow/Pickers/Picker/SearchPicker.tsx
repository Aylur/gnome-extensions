import St from "gi://St"
import Clutter from "gi://Clutter"
import Grid from "#/widgets/Grid"
import { useGnofi } from "#/Gnofi"
import { Accessed, Accessor, createBinding, For } from "gnim"
import * as Gnofi from "gnofi"
import { SearchPickerSchema } from "~schemas"
import PickerButton from "#/widgets/PickerButton"
import { osdWindowManager } from "resource:///org/gnome/shell/ui/main.js"
import Separator from "#/widgets/Separator"
import { useExtension } from "#/extenstion"

export default function SearchPicker(props: {
  picker: Gnofi.SearchPicker
  schema: Accessor<SearchPickerSchema>
}) {
  const { gnofi } = useGnofi()
  const { picker, schema } = props
  const { gettext: t } = useExtension()

  const name = picker.app?.get_name() || ""
  const result = createBinding(picker, "result")
  const surplus = createBinding(picker, "resultSurplus")

  function activate(item: Accessed<typeof result>[number]) {
    if (item.clipboardText) {
      St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, item.clipboardText)
    }

    if (schema.get().copyOnly) {
      osdWindowManager.show(
        global.display.get_current_monitor(),
        item.gicon,
        item.name,
        null,
      )
    } else {
      item.activate(gnofi.text)
    }

    gnofi.close()
  }

  return (
    <St.BoxLayout
      xExpand
      visible={result((r) => r.length > 0)}
      orientation={Clutter.Orientation.VERTICAL}
      css={schema((s) => {
        const [t = 2, r = 2, b = 2, l = 2] = s.margin
        return `margin:${t}px ${r}px ${b}px ${l}px`
      })}
    >
      <St.BoxLayout xExpand css={schema((s) => `margin-bottom:${s.gap}px`)}>
        <PickerButton
          xExpand={false}
          icon={picker.app?.get_icon()}
          iconSize={18}
          onClick={() => picker.activate(gnofi.text)}
          padding={[4, 8]}
          name={surplus((s) => (s > 0 ? t("%s  %d more").format(name, s) : name))}
        />
        <Separator css="margin-left: 8px" />
      </St.BoxLayout>
      <Grid
        xExpand
        rowHomogeneous
        columnHomogeneous
        breakpoint={schema((s) => s.breakpoint)}
        rowSpacing={schema((s) => s.gap)}
        columnSpacing={schema((s) => s.gap)}
        orientation={schema((s) =>
          s.verticalGrid ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
        )}
      >
        <For each={result}>
          {(item) => (
            <PickerButton
              icon={item.gicon}
              name={item.name}
              description={item.description}
              iconSize={schema((p) => p.iconsize)}
              padding={schema((p) => p.padding)}
              labelLayout={schema((p) => p.label)}
              vertical={schema((p) => p.verticalButton)}
              onClick={() => activate(item)}
            />
          )}
        </For>
      </Grid>
    </St.BoxLayout>
  )
}
