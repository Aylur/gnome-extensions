import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import { useStyle } from "gnim-hooks/gtk4"
import type { RootContent } from "mdast"

// I have honestly no idea how inaccessible this approach is, but I found using
// only pango not flexible enough, as I want to style inlineCode using css variables
// and have a tooltipText on link elements.

// FIXME: this is very inefficient and laggy
export default function Paragraph(props: {
  hexpand?: boolean
  class?: string
  children: RootContent | RootContent[]
  onActivateLink: (uri: string) => void
}) {
  const { children, onActivateLink } = props
  const nodes = Array.isArray(children) ? children : [children]

  return (
    <Adw.WrapBox
      hexpand={props.hexpand}
      class={props.class}
      justify={Adw.JustifyMode.FILL}
      lineSpacing={1}
      childSpacing={3}
    >
      {nodes.flatMap((node) => {
        switch (node.type) {
          case "paragraph":
            return <Paragraph onActivateLink={onActivateLink}>{node.children}</Paragraph>
          case "text":
            return node.value
              .replaceAll("\n", " ")
              .split(" ")
              .flatMap((text) => <Gtk.Label label={text} />)
          case "emphasis":
            return node.children.map((node) => (
              <Paragraph
                class={useStyle({ "font-style": "italic" })}
                onActivateLink={onActivateLink}
              >
                {node}
              </Paragraph>
            ))
          case "strong":
            return node.children.map((node) => (
              <Paragraph
                class={useStyle({ "font-weight": "bold" })}
                onActivateLink={onActivateLink}
              >
                {node}
              </Paragraph>
            ))
          case "delete":
            return node.children.map((node) => (
              <Paragraph
                class={useStyle({ "text-decoration": "line-through" })}
                onActivateLink={onActivateLink}
              >
                {node}
              </Paragraph>
            ))
          case "inlineCode":
            return (
              <Gtk.Label
                class={useStyle({
                  "background-color": "alpha(var(--accent-color), 0.05)",
                  "border-radius": "3px",
                  "color": "var(--accent-color)",
                })}
                useMarkup
                label={`<tt>${node.value}</tt>`}
              />
            )
          case "link":
            return (
              <Adw.Bin tooltipText={node.url}>
                <Paragraph
                  class={useStyle({ color: "var(--accent-blue)" })}
                  onActivateLink={onActivateLink}
                >
                  {node.children}
                </Paragraph>
                <Gtk.GestureClick onPressed={() => onActivateLink(node.url)} />
              </Adw.Bin>
            )
          default:
            throw Error(`unhandled node: "${node.type}"`)
        }
      })}
    </Adw.WrapBox>
  )
}
