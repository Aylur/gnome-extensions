import Pango from "gi://Pango"
import Gtk from "gi://Gtk?version=4.0"
import type { PhrasingContent } from "mdast"

function pango(node: PhrasingContent): string {
  let markup = ""
  switch (node.type) {
    case "text":
      markup = node.value
      break
    case "emphasis":
      markup = `<i>${node.children.map(pango)}</i>`
      break
    case "strong":
      markup = `<b>${node.children.map(pango)}</b>`
      break
    case "delete":
      markup = `<s>${node.children.map(pango)}</s>`
      break
    case "inlineCode":
      markup = `<tt>${node.value}</tt>`
      break
    case "link":
      markup = `<a href="${node.url}"><span underline="none">${node.children.map(pango)}</span></a>`
      break
    default:
      throw Error(`unhandled node: "${node.type}"`)
  }
  return markup.replaceAll("\n", " ")
}

export default function Header(props: {
  ref: (label: Gtk.Label) => void
  children: PhrasingContent[]
  depth: 1 | 2 | 3 | 4 | 5 | 6
}) {
  const { ref, children, depth } = props
  const markup = children.map(pango).join("")
  const [, , text] = Pango.parse_markup(markup, -1, "")

  const name = text
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replaceAll("_", "-")
    .toLowerCase()

  return (
    <Gtk.Box
      orientation={Gtk.Orientation.VERTICAL}
      marginTop={depth > 1 ? 38 / depth : 0}
    >
      <Gtk.Label
        $={ref}
        name={name}
        halign={Gtk.Align.START}
        class={`title-${depth}`}
        useMarkup
        label={markup}
      />
      {depth < 3 && <Gtk.Separator marginTop={12 / depth} marginBottom={12 / depth} />}
    </Gtk.Box>
  )
}
