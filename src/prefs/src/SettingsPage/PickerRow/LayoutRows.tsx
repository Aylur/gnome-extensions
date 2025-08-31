import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { LayoutSchema, LabelLayout } from "~schemas"
import { createState } from "gnim"

export default function LayoutRows<S extends LayoutSchema>(props: {
  schema: S
  onChange: (schema: S) => void
}) {
  const [schema, setSchema] = createState(props.schema as LayoutSchema)

  const set = <Key extends keyof LayoutSchema>(key: Key, value: LayoutSchema[Key]) => {
    setSchema((prev) => prev.copy({ [key]: value }))
    props.onChange(schema.get() as S)
  }

  const setMargin = (i: number, value: number) => {
    setSchema((prev) => {
      const [t = 2, r = 2, b = 2, l = 2] = prev.margin
      const margin = [t, r, b, l]
      margin[i] = value
      return prev.copy({ margin })
    })
    props.onChange(schema.get() as S)
  }

  const labelLayoutLabels: Record<LabelLayout, string> = {
    [LabelLayout.BOTH]: _("Name and Description"),
    [LabelLayout.NAME]: _("Name Only"),
    [LabelLayout.DESCRIPTION]: _("Description Only"),
    [LabelLayout.BOTH_INLINE]: _("Both Inline"),
    [LabelLayout.NONE]: _("None"),
  }

  return (
    <>
      <Adw.ActionRow
        title={_("Grid Orientation")}
        subtitle={_("Orientation of the grid and button content")}
      >
        <Adw.ToggleGroup
          class="flat"
          valign={Gtk.Align.CENTER}
          activeName={schema((s) => (s.verticalGrid ? "v" : "h"))}
          onNotifyActiveName={({ activeName }) => set("verticalGrid", activeName === "v")}
        >
          <Adw.Toggle name="v" label={_("Vertical")} />
          <Adw.Toggle name="h" label={_("Horizontal")} />
        </Adw.ToggleGroup>
      </Adw.ActionRow>
      <Adw.ActionRow
        title={_("Button Content Orientation")}
        subtitle={_("Orientation of the grid and button content")}
      >
        <Adw.ToggleGroup
          class="flat"
          valign={Gtk.Align.CENTER}
          activeName={schema((s) => (s.verticalButton ? "v" : "h"))}
          onNotifyActiveName={({ activeName }) =>
            set("verticalButton", activeName === "v")
          }
        >
          <Adw.Toggle name="v" label={_("Vertical")} />
          <Adw.Toggle name="h" label={_("Horizontal")} />
        </Adw.ToggleGroup>
      </Adw.ActionRow>
      <Adw.SpinRow
        title={_("Result Limit")}
        subtitle={_("Number of result items to show")}
      >
        <Gtk.Adjustment
          lower={1}
          upper={32}
          pageIncrement={1}
          stepIncrement={1}
          value={schema((l) => l.limit)}
          onNotifyValue={({ value }) => set("limit", value)}
        />
      </Adw.SpinRow>
      <Adw.SpinRow
        title={_("Grid Breakpoint")}
        subtitle={schema((l) =>
          l.verticalGrid
            ? _("The number of items in a column")
            : _("The number of items in a row"),
        )}
      >
        <Gtk.Adjustment
          lower={1}
          upper={32}
          pageIncrement={1}
          stepIncrement={1}
          value={schema((l) => l.breakpoint)}
          onNotifyValue={({ value }) => set("breakpoint", value)}
        />
      </Adw.SpinRow>
      <Adw.SpinRow title={_("Icon Size")} subtitle={_("Size of button icons")}>
        <Gtk.Adjustment
          lower={16}
          upper={128}
          pageIncrement={1}
          stepIncrement={1}
          value={schema((l) => l.iconsize)}
          onNotifyValue={({ value }) => set("iconsize", value)}
        />
      </Adw.SpinRow>
      <Adw.SpinRow
        title={_("Padding")}
        subtitle={_("Space between button content and its border")}
      >
        <Gtk.Adjustment
          lower={0}
          upper={56}
          pageIncrement={1}
          stepIncrement={1}
          value={schema((l) => l.padding)}
          onNotifyValue={({ value }) => set("padding", value)}
        />
      </Adw.SpinRow>
      <Adw.SpinRow title={_("Gap")} subtitle={_("Space between rows and columns")}>
        <Gtk.Adjustment
          lower={0}
          upper={56}
          pageIncrement={1}
          stepIncrement={1}
          value={schema((l) => l.gap)}
          onNotifyValue={({ value }) => set("gap", value)}
        />
      </Adw.SpinRow>
      <Adw.ActionRow title={_("Margin")} subtitle={_("Space around the grid")}>
        {[0, 1, 2, 3].map((index) => (
          <Gtk.MenuButton class="flat" valign={Gtk.Align.CENTER}>
            <Gtk.Label class="body" label={schema((l) => `${l.margin[index] ?? 2}`)} />
            <Gtk.Popover>
              <Gtk.SpinButton>
                <Gtk.Adjustment
                  lower={0}
                  upper={56}
                  pageIncrement={1}
                  stepIncrement={1}
                  value={schema((l) => l.margin[index] ?? 2)}
                  onNotifyValue={({ value }) => setMargin(index, value)}
                />
              </Gtk.SpinButton>
            </Gtk.Popover>
          </Gtk.MenuButton>
        ))}
      </Adw.ActionRow>
      <Adw.ComboRow
        title={_("Label")}
        model={Gtk.StringList.new(Object.values(labelLayoutLabels))}
        selected={schema((l) => l.label)}
        onNotifySelected={({ selected }) => set("label", selected)}
      />
    </>
  )
}
