import St from "gi://St"
import Clutter from "gi://Clutter"
import GObject, { register, property } from "gnim/gobject"
import { createBinding, This } from "gnim"

export function chunks<T>(size: number, arr: T[]): T[][] {
  const result = [] as T[][]
  for (let i = 0; i < arr.length; i += size) {
    const chunk = arr.slice(i, i + size)
    result.push(chunk)
  }
  return result
}

interface GridProps extends Omit<St.Widget.ConstructorProps, "layoutManager"> {
  orientation: Clutter.Orientation
  columnHomogeneous: boolean
  columnSpacing: number
  rowHomogeneous: boolean
  rowSpacing: number
  breakpoint: number
}

const Orientation = (name: string, flags: GObject.ParamFlags) =>
  GObject.ParamSpec.enum(
    name,
    "",
    "",
    flags,
    Clutter.Orientation,
    Clutter.Orientation.HORIZONTAL,
  )

@register()
class GridPadding extends St.Widget {
  constructor() {
    super({ xExpand: true, yExpand: true })
  }
}

@register()
export default class Grid extends St.Widget {
  declare $signals: St.Widget.SignalSignatures & {
    "notify::breakpoint": () => void
    "notify::orientation": () => void
  }

  @property(Boolean) columnHomogeneous: boolean
  @property(Number) columnSpacing: number
  @property(Orientation) orientation: Clutter.Orientation
  @property(Boolean) rowHomogeneous: boolean
  @property(Number) rowSpacing: number
  @property(Number) breakpoint: number

  private grid!: Clutter.GridLayout

  private reorder(actors = this.get_children()) {
    this.remove_all_children()

    const grid = chunks(this.breakpoint, actors)
    const last = grid.at(-1)

    if (this.orientation === Clutter.Orientation.HORIZONTAL && last) {
      while (last.length < this.breakpoint) {
        last.push(new GridPadding())
      }
    }

    grid.map((line, i) => {
      line.map((child, j) => {
        if (this.orientation === Clutter.Orientation.HORIZONTAL) {
          this.grid.attach(child, j, i, 1, 1)
        } else {
          this.grid.attach(child, i, j, 1, 1)
        }
      })
    })
  }

  get_children(): Clutter.Actor[] {
    return super.get_children().filter((ch) => !(ch instanceof GridPadding))
  }

  remove_all_children(): void {
    for (const child of super.get_children()) {
      if (child instanceof GridPadding) {
        child.destroy()
      }
    }
    super.remove_all_children()
  }

  add_child(child: Clutter.Actor): void {
    this.reorder([...this.get_children(), child])
  }

  remove_child(child: Clutter.Actor): void {
    const children = this.get_children()
    this.remove_all_children()
    this.reorder(children.filter((ch) => ch !== child))
  }

  constructor({
    columnHomogeneous = false,
    columnSpacing = 0,
    orientation = Clutter.Orientation.HORIZONTAL,
    rowHomogeneous = false,
    rowSpacing = 0,
    breakpoint = 10,
    ...props
  }: Partial<GridProps>) {
    super(props)

    this.columnHomogeneous = columnHomogeneous
    this.columnSpacing = columnSpacing
    this.orientation = orientation
    this.rowHomogeneous = rowHomogeneous
    this.rowSpacing = rowSpacing
    this.breakpoint = breakpoint

    void (
      <This
        this={this as Grid}
        onNotifyBreakpoint={() => this.reorder()}
        onNotifyOrientation={() => this.reorder()}
      >
        <Clutter.GridLayout
          $={(self) => (this.grid = self)}
          columnHomogeneous={createBinding(this, "columnHomogeneous")}
          columnSpacing={createBinding(this, "columnSpacing")}
          orientation={createBinding(this, "orientation")}
          rowHomogeneous={createBinding(this, "rowHomogeneous")}
          rowSpacing={createBinding(this, "rowSpacing")}
        />
      </This>
    )
  }
}
