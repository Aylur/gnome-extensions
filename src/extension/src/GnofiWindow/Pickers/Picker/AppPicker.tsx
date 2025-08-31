import St from "gi://St"
import Clutter from "gi://Clutter"
import { Accessor, createBinding, For } from "gnim"
import * as Gnofi from "gnofi"
import { useGnofi } from "#/Gnofi"
import { AppPickerSchema } from "~schemas"
import Grid from "#/widgets/Grid"
import PickerButton from "#/widgets/PickerButton"
import Separator from "#/widgets/Separator"

export default function AppPicker(props: {
  picker: Gnofi.AppPicker
  schema: Accessor<AppPickerSchema>
}) {
  const { gnofi } = useGnofi()
  const { picker, schema } = props

  const result = createBinding(picker, "result").as((r) => r.slice(0, schema.get().limit))

  return (
    <St.BoxLayout xExpand orientation={Clutter.Orientation.VERTICAL}>
      <Separator visible={result((r) => r.length > 0)} />
      <Grid
        xExpand
        rowHomogeneous
        columnHomogeneous
        breakpoint={schema((s) => s.breakpoint)}
        rowSpacing={schema((s) => s.gap)}
        columnSpacing={schema((s) => s.gap)}
        css={schema((s) => {
          const [t = 2, r = 2, b = 2, l = 2] = s.margin
          return `margin:${t}px ${r}px ${b}px ${l}px`
        })}
        orientation={schema((s) =>
          s.verticalGrid ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
        )}
      >
        <For each={result}>
          {(app) => (
            <PickerButton
              icon={app.get_icon()}
              name={app.get_name()}
              description={app.get_description()}
              iconSize={schema((p) => p.iconsize)}
              padding={schema((p) => p.padding)}
              labelLayout={schema((p) => p.label)}
              vertical={schema((p) => p.verticalButton)}
              onClick={() => (app.launch([], null), gnofi.close())}
            />
          )}
        </For>
      </Grid>
    </St.BoxLayout>
  )
}
