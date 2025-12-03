import { gtype, property, register } from "gnim/gobject"
import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import { createEffect, createBinding, onCleanup, This } from "gnim"
import { traverseWidgetTree } from "#/utils"

type State = "error" | "warning" | "none"
const State = gtype<State>(String)

interface EntryRowProps extends Adw.EntryRow.ConstructorProps {
  state: State
  explanation: string
}

@register()
export default class EntryRow extends Adw.EntryRow {
  declare $signals: Adw.EntryRow.SignalSignatures & {
    "notify::state"(): void
    "notify::explanation"(): void
  }

  @property(State) state: State
  @property(String) explanation: string

  constructor({
    state: _state = "none",
    explanation = "",
    ...props
  }: Partial<EntryRowProps>) {
    super(props)
    this.state = _state
    this.explanation = explanation

    const state = createBinding(this, "state")
    const expl = createBinding(this, "explanation")
    const labels = new Array<Gtk.Label>()

    traverseWidgetTree(this, (w) => {
      if (w instanceof Gtk.Label) {
        labels.push(w)
        This({ this: w, css: "transition:200ms;" })
      }
    })

    createEffect(() => {
      if (state() !== "none") {
        labels.map((l) => {
          l.add_css_class(state())
          l.remove_css_class("dimmed")
        })
      } else {
        labels.map((l) => {
          l.remove_css_class("error")
          l.remove_css_class("warning")
          l.add_css_class("dimmed")
        })
      }
    })

    onCleanup(() => {
      labels.length = 0
    })

    void (
      <This this={this as EntryRow}>
        <Gtk.MenuButton
          $type="suffix"
          class="flat"
          canFocus={false}
          valign={Gtk.Align.CENTER}
          visible={expl(Boolean)}
          iconName="dialog-information-symbolic"
        >
          <Gtk.Popover>
            <Gtk.Label
              maxWidthChars={32}
              useMarkup
              wrap
              marginTop={8}
              marginBottom={8}
              marginEnd={10}
              marginStart={10}
              label={expl}
            />
          </Gtk.Popover>
        </Gtk.MenuButton>
      </This>
    )
  }
}
