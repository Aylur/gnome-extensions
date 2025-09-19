import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { LayoutSchema, LabelLayout } from "~schemas"
import { createState } from "gnim"
import { useToggleGroup } from "#/utils"

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
    [LabelLayout.BOTH]: t("Name and Description"),
    [LabelLayout.NAME]: t("Name Only"),
    [LabelLayout.DESCRIPTION]: t("Description Only"),
    [LabelLayout.BOTH_INLINE]: t("Both Inline"),
    [LabelLayout.NONE]: t("None"),
  }

  return (
    <>
      <Adw.ActionRow
        title={t("Grid Orientation")}
        subtitle={t("Orientation of the grid and button content")}
      >
        <Gtk.Box valign={Gtk.Align.CENTER} spacing={4}>
          <Gtk.Button
            onClicked={() => set("verticalGrid", true)}
            $={useToggleGroup(schema((s) => s.verticalGrid))}
          >
            {t("Vertical")}
          </Gtk.Button>
          <Gtk.Button
            onClicked={() => set("verticalGrid", false)}
            $={useToggleGroup(schema((s) => !s.verticalGrid))}
          >
            {t("Horizontal")}
          </Gtk.Button>
        </Gtk.Box>
      </Adw.ActionRow>
      <Adw.ActionRow
        title={t("Button Content Orientation")}
        subtitle={t("Orientation of the grid and button content")}
      >
        <Gtk.Box valign={Gtk.Align.CENTER} spacing={4}>
          <Gtk.Button
            onClicked={() => set("verticalButton", true)}
            $={useToggleGroup(schema((s) => s.verticalButton))}
          >
            {t("Vertical")}
          </Gtk.Button>
          <Gtk.Button
            onClicked={() => set("verticalButton", false)}
            $={useToggleGroup(schema((s) => !s.verticalButton))}
          >
            {t("Horizontal")}
          </Gtk.Button>
        </Gtk.Box>
      </Adw.ActionRow>
      <Adw.SpinRow
        title={t("Result Limit")}
        subtitle={t("Number of result items to show")}
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
        title={t("Grid Breakpoint")}
        subtitle={schema((l) =>
          l.verticalGrid
            ? t("The number of items in a column")
            : t("The number of items in a row"),
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
      <Adw.SpinRow title={t("Icon Size")} subtitle={t("Size of button icons")}>
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
        title={t("Padding")}
        subtitle={t("Space between button content and its border")}
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
      <Adw.SpinRow title={t("Gap")} subtitle={t("Space between rows and columns")}>
        <Gtk.Adjustment
          lower={0}
          upper={56}
          pageIncrement={1}
          stepIncrement={1}
          value={schema((l) => l.gap)}
          onNotifyValue={({ value }) => set("gap", value)}
        />
      </Adw.SpinRow>
      <Adw.ActionRow title={t("Margin")} subtitle={t("Space around the grid")}>
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
        title={t("Label")}
        model={Gtk.StringList.new(Object.values(labelLayoutLabels))}
        selected={schema((l) => l.label)}
        onNotifySelected={({ selected }) => set("label", selected)}
      />
    </>
  )
}
