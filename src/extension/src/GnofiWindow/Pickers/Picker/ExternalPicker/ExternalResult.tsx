import GObject from "gi://GObject"
import Clutter from "gi://Clutter"
import St from "gi://St"
import GIRepository from "gi://GIRepository"
import Grid from "#/widgets/Grid"
import { jsx, This } from "gnim"
import { errorStr, ExternalPicker } from "gnofi"
import { useConnect } from "gnim-hooks"
import { useGnofi } from "#/Gnofi"

const repo = GIRepository.Repository.get_default()

function kebabify(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replaceAll("_", "-")
    .toLowerCase()
}

const widgets: Record<string, typeof St.Widget> = {
  Label: St.Label,
  Box: St.BoxLayout,
  Icon: St.Icon,
  Button: St.Button,
  Grid: Grid,
}

type Node =
  | [keyof typeof widgets]
  | [keyof typeof widgets, Record<string, unknown>, ...Node[]]

function renderNode(
  [node, props = {}, ...children]: Node,
  refs: Map<string, Clutter.Actor>,
  action: (data: unknown) => void,
): St.Widget {
  const { gnofi } = useGnofi()

  let refId: string
  const Ctor = widgets[node]

  if ("$" in props && typeof props.$ === "string" && props.$ !== "") {
    refId = props.$
  }

  if (Ctor === St.Button) {
    props.canFocus = props.canFocus ?? props.can_focus ?? props["can-focus"] ?? true
  }

  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on")) {
      props[key] = () => action(value)
    }

    // convert strings to enums when needed
    if (typeof value === "string") {
      const type = Ctor.find_property(kebabify(key))?.value_type
      if (type && GObject.type_is_a(type, GObject.TYPE_ENUM)) {
        const namespace = repo.find_by_gtype(type).get_namespace()
        const name = repo.find_by_gtype(type).get_name()
        // @ts-expect-error too lazy to type this out
        props[key] = imports.gi[namespace][name][value.toUpperCase()]
      }
    }
  }

  function init(self: St.Widget) {
    if (refId) refs.set(refId, self)
    if (self instanceof St.Button) {
      self.add_style_class_name("popup-menu-item")
      void (
        <This
          this={self}
          onKeyPressEvent={(_, event) =>
            gnofi.keypress({
              focusedEntry: false,
              controlMod: event.has_control_modifier(),
              key: event.get_key_symbol(),
            })
          }
          onKeyFocusIn={(self) => self.add_style_pseudo_class("selected")}
          onKeyFocusOut={(self) => self.remove_style_pseudo_class("selected")}
        />
      )
    }
  }

  return jsx(Ctor, {
    ...(props as any),
    $: init,
    children: children.map((node) => renderNode(node, refs, action)),
  })
}

function validateNode(result: unknown[]): result is Node {
  const [node, props = {}] = result

  if (typeof node !== "string" || !widgets[node]) {
    throw Error(`invalid result: unknown component "${node}"`)
  }

  if (typeof props !== "object") {
    throw Error(`invalid result: component props "${props}" is not an object`)
  }

  return true
}

export default function ExternalResult(props: {
  picker: ExternalPicker
  result: unknown
}) {
  const { picker, result } = props

  const refs = new Map<string, Clutter.Actor>()

  const action = (data: unknown) => {
    picker.action(
      typeof data === "object" && data !== null
        ? (data as Record<string | number, unknown>)
        : { [ExternalPicker.actionData]: data },
    )
  }

  if (!Array.isArray(result)) {
    picker.error(`invalid result: "${result}" is not a tuple`)
    return <St.Label text={`${result}`} />
  }

  useConnect(picker, "set-props", (ref, props) => {
    const object = refs?.get(ref)
    if (object) Object.assign(object, props)
  })

  try {
    if (validateNode(result)) {
      return renderNode(result, refs, action)
    }
  } catch (error) {
    const e = errorStr(error)
    picker.error(e)
    return <St.Label text={e} />
  }

  throw Error()
}
