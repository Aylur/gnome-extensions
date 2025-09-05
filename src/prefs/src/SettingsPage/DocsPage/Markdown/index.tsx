import Gtk from "gi://Gtk"
import Header from "./Header"
import Code from "./Code"
import Paragraph from "./Paragraphs"
import Container from "./Container"
import List from "./List"
import type { Root } from "mdast"

export default function Markdown(props: {
  ref: (self: { headers: Array<Gtk.Label> }) => void
  md: Omit<Root, "type">
  onNavigation: (uri: string) => void
  onCopy: (text: string) => void
  spacing?: number
}) {
  const { ref, md, onNavigation, spacing = 12 } = props
  const headers = new Array<Gtk.Label>()

  return (
    <Gtk.Box
      orientation={Gtk.Orientation.VERTICAL}
      spacing={spacing}
      $={() => ref({ headers })}
    >
      {md.children.flatMap((node): Array<JSX.Element> | JSX.Element | null => {
        switch (node.type) {
          case "heading": {
            return (
              <Header ref={(self) => headers.push(self)} depth={node.depth}>
                {node.children}
              </Header>
            )
          }
          case "code": {
            return (
              <Code frame lang={node.lang} onCopy={props.onCopy}>
                {node.value}
              </Code>
            )
          }
          case "paragraph": {
            return (
              <Paragraph hexpand onActivateLink={onNavigation}>
                {node.children}
              </Paragraph>
            )
          }
          case "blockquote": {
            const [p, ...children] = node.children
            if (p.type === "paragraph") {
              const [text] = p.children
              if (text.type === "text") {
                return (
                  <Container type={text.value}>
                    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
                      {children.map((content) => (
                        <Markdown
                          spacing={8}
                          md={{ children: [content] }}
                          ref={(self) => headers.push(...self.headers)}
                          onNavigation={onNavigation}
                          onCopy={props.onCopy}
                        />
                      ))}
                    </Gtk.Box>
                  </Container>
                )
              }
            }
            throw Error(`invalid blockquote`)
          }
          case "list":
            return (
              <List ordered={node.ordered} start={node.start}>
                {node.children.map((child) => (
                  <Markdown
                    spacing={8}
                    md={child}
                    ref={(self) => headers.push(...self.headers)}
                    onNavigation={onNavigation}
                    onCopy={props.onCopy}
                  />
                ))}
              </List>
            )

          case "text":
          case "emphasis":
          case "strong":
          case "delete":
          case "link":
          case "inlineCode":
            return <Paragraph onActivateLink={onNavigation}>{node}</Paragraph>

          // html comments
          case "html":
            return null

          default:
            throw Error(`unhandled node: "${node.type}"`)
        }
      })}
    </Gtk.Box>
  )
}
