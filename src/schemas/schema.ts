import GLib from "gi://GLib"
import GioUnix from "gi://GioUnix"
import GObject, { register } from "gnim/gobject"

type Dict<T = unknown> = Record<string, T>

export enum LabelLayout {
  BOTH = 0,
  NAME = 1,
  DESCRIPTION = 2,
  BOTH_INLINE = 3,
  NONE = 4,
}

@register()
export class PickerSchema extends GObject.Object {
  readonly name: string
  readonly id: string

  constructor({ name, id }: { name: unknown; id: unknown }) {
    super()
    this.name = typeof name === "string" ? name : ""
    this.id = typeof id === "string" && id !== "" ? id : GLib.uuid_string_random()
  }

  is(s: PickerSchema): boolean {
    if (s === this || (this.id && s.id && this.id === s.id)) return true

    const a = new GLib.Variant("a{sv}", this.dict).print(false)
    const b = new GLib.Variant("a{sv}", s.dict).print(false)

    return a === b
  }

  copy(props: Partial<this>): this {
    // @ts-expect-error too lazy to type assert
    return new this.constructor({ ...this, ...props })
  }

  get dict(): Dict<GLib.Variant> {
    return {
      id: new GLib.Variant("s", this.id),
    }
  }
}

@register()
export class ExternalPickerSchema extends PickerSchema {
  readonly executable: string
  readonly type: "persistent" | "transient"

  static new({ type }: { type: "persistent" | "transient" }) {
    return new ExternalPickerSchema({ name: "", executable: "", type })
  }

  constructor({ executable, type, name, id }: Dict) {
    super({ name, id })

    if (typeof executable !== "string") {
      throw Error("missing executable from ExternalPickerSchema")
    }

    if (type !== "persistent" && type !== "transient") {
      throw Error("missing or invalid type from ExternalPickerSchema")
    }

    this.type = type
    this.executable = executable
  }

  get dict(): Dict<GLib.Variant> {
    return Object.assign(super.dict, {
      type: new GLib.Variant("s", this.type),
      name: new GLib.Variant("s", this.name),
      executable: new GLib.Variant("s", this.executable),
    })
  }
}

@register()
export class LayoutSchema extends PickerSchema {
  readonly verticalGrid: boolean
  readonly verticalButton: boolean
  readonly limit: number
  readonly breakpoint: number
  readonly iconsize: number
  readonly label: LabelLayout
  readonly padding: number
  readonly gap: number
  readonly margin: number[]

  constructor({
    verticalGrid,
    verticalButton,
    limit,
    breakpoint,
    iconsize,
    label,
    padding,
    gap,
    margin,
    name,
    id,
  }: Dict) {
    super({ name, id })
    this.verticalGrid = typeof verticalGrid === "boolean" ? verticalGrid : false
    this.verticalButton = typeof verticalButton === "boolean" ? verticalButton : false
    this.limit = typeof limit === "number" ? limit : 6
    this.breakpoint = typeof breakpoint === "number" ? breakpoint : 1
    this.iconsize = typeof iconsize === "number" ? iconsize : 48
    this.label = typeof label === "number" ? label % 5 : LabelLayout.BOTH
    this.padding = typeof padding === "number" ? padding : 5
    this.gap = typeof gap === "number" ? gap : 2
    this.margin =
      Array.isArray(margin) && margin.every((m) => typeof m === "number")
        ? margin
        : [2, 0, 0, 0]
  }

  get dict(): Dict<GLib.Variant> {
    return Object.assign(super.dict, {
      verticalGrid: new GLib.Variant("b", this.verticalGrid),
      verticalButton: new GLib.Variant("b", this.verticalButton),
      limit: new GLib.Variant("i", this.limit),
      breakpoint: new GLib.Variant("i", this.breakpoint),
      iconsize: new GLib.Variant("i", this.iconsize),
      label: new GLib.Variant("i", this.label),
      padding: new GLib.Variant("i", this.padding),
      gap: new GLib.Variant("i", this.gap),
      margin: new GLib.Variant("ai", this.margin),
    })
  }
}

@register()
export class SearchPickerSchema extends LayoutSchema {
  readonly busName: string
  readonly objectPath: string
  readonly desktopId: string
  readonly copyOnly: boolean
  readonly appInfo?: GioUnix.DesktopAppInfo

  static new(props: { busName: string; objectPath: string; desktopId: string }) {
    return new SearchPickerSchema(props)
  }

  constructor({ busName, objectPath, desktopId, copyOnly, ...props }: Dict) {
    if (typeof busName !== "string") {
      throw Error("missing 'busName' in SearchPickerSchema")
    }
    if (typeof objectPath !== "string") {
      throw Error("missing 'objectPath' in SearchPickerSchema")
    }
    if (typeof desktopId !== "string") {
      throw Error("missing 'desktopId' in SearchPickerSchema")
    }

    const appInfo = GioUnix.DesktopAppInfo.new(desktopId)
    super({ ...props, name: appInfo?.get_name() || "Unknown" })

    this.busName = busName
    this.objectPath = objectPath
    this.desktopId = desktopId
    this.copyOnly = typeof copyOnly === "boolean" && copyOnly
    this.appInfo = GioUnix.DesktopAppInfo.new(this.desktopId)
  }

  get dict(): Dict<GLib.Variant> {
    return Object.assign(super.dict, {
      type: new GLib.Variant("s", "search"),
      busName: new GLib.Variant("s", this.busName),
      objectPath: new GLib.Variant("s", this.objectPath),
      desktopId: new GLib.Variant("s", this.desktopId),
      copyOnly: new GLib.Variant("b", this.copyOnly),
    })
  }
}

@register()
export class AppPickerSchema extends LayoutSchema {
  static new({ name }: { name: string }) {
    return new AppPickerSchema({ name })
  }

  get dict(): Dict<GLib.Variant> {
    return Object.assign(super.dict, {
      type: new GLib.Variant("s", "app"),
    })
  }
}

export function createSchema({ type, ...props }: Dict): PickerSchema {
  switch (type) {
    case "persistent":
    case "transient":
      return new ExternalPickerSchema({ type, ...props })
    case "search":
      return new SearchPickerSchema({ type, ...props })
    case "app":
      return new AppPickerSchema({ type, ...props })
    default:
      throw Error(`unknown picker type "${type}"`)
  }
}
