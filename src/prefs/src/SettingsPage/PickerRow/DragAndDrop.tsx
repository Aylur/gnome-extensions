import Gtk from "gi://Gtk"
import Gdk from "gi://Gdk"
import GObject from "gi://GObject"
import { Accessor, For } from "gnim"

type GConstructor = {
  readonly $gtype: GObject.GType
  new (...args: any[]): GObject.Object
}

type DraggableProps<T extends GConstructor> = {
  type: T
  enable?: Accessor<boolean>
  children: (widget: Gtk.Widget) => JSX.Element
  onPrepare: (widget: Gtk.Widget) => InstanceType<T>
  onDrop: (value: InstanceType<T>) => boolean | void
}

export default function DragAndDrop<T extends GConstructor>({
  type: Type,
  enable = new Accessor(() => true),
  onPrepare,
  children: onDragBegin,
  onDrop,
}: DraggableProps<T>) {
  let dragX: number
  let dragY: number

  // HACK: gnim does not yet support nested Fragments so we can't use <With>
  const each = enable((v) => (v ? [true, false] : []))

  return (
    <For each={each}>
      {(t) =>
        t ? (
          <Gtk.DragSource
            actions={Gdk.DragAction.COPY}
            onPrepare={({ widget }, x, y) => {
              dragX = x
              dragY = y
              return Gdk.ContentProvider.new_for_value(
                // @ts-expect-error ts-for-gir not yet typed
                new GObject.Value(Type.$gtype, onPrepare(widget)),
              )
            }}
            onDragBegin={({ widget }, drag: Gdk.Drag) => {
              drag.set_hotspot(dragX, dragY)
              Gtk.DragIcon.get_for_drag(drag).child = onDragBegin(widget) as Gtk.Widget
            }}
          />
        ) : (
          <Gtk.DropTarget
            $constructor={() => Gtk.DropTarget.new(Type.$gtype, Gdk.DragAction.COPY)}
            onDrop={(_, value) => {
              // Value is already unpacked
              onDrop(value as InstanceType<T>)
            }}
          />
        )
      }
    </For>
  )
}
