import St from "gi://St"
import Clutter from "gi://Clutter"
import { Accessor, createBinding, For } from "gnim"
import * as Gnofi from "gnofi"
import { ExternalPickerSchema } from "~schemas"
import ExternalResult from "./ExternalResult"
import Separator from "#/widgets/Separator"
import Grid from "#/widgets/Grid"

type Margin = [number, number, number, number]
function isMargins(m: unknown): m is Margin {
  return Array.isArray(m) && m.length === 4 && m.every((n) => typeof n === "number")
}

export default function ExternalPicker(props: {
  picker: Gnofi.ExternalPicker
  schema: Accessor<ExternalPickerSchema>
}) {
  const { picker } = props
  const result = createBinding(picker, "result")
  const settings = createBinding(picker, "settings")

  // TODO: warn on invalid props

  const vertical = settings((s) => (typeof s.vertical === "boolean" ? s.vertical : false))
  const breakpoint = settings((s) =>
    typeof s.breakpoint === "number" ? s.breakpoint : 1,
  )

  const gap = settings((s) => (typeof s.gap === "number" ? s.gap : 0))
  const margin = settings((s) =>
    isMargins(s.margin) ? s.margin : ([0, 0, 0, 0] as const),
  )

  const homogeneous = settings((s) =>
    typeof s.homogeneous === "boolean" ? s.homogeneous : true,
  )

  return (
    <St.BoxLayout xExpand vertical visible={result((r) => r.length > 0)}>
      <Separator />
      <Grid
        xExpand
        rowHomogeneous={homogeneous}
        columnHomogeneous={homogeneous}
        breakpoint={breakpoint}
        rowSpacing={gap}
        columnSpacing={gap}
        css={margin(([t, r, b, l]) => `margin:${t}px ${r}px ${b}px ${l}px`)}
        orientation={vertical((v) =>
          v ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
        )}
      >
        <For each={result}>
          {(item) => <ExternalResult picker={picker} result={item} />}
        </For>
      </Grid>
    </St.BoxLayout>
  )
}
