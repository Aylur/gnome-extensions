import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Gtk from "gi://Gtk"
import Adw from "gi://Adw"
import { createBinding, createState } from "gnim"
import { useStyle } from "gnim-hooks/gtk4"

// optional dependency
const GtkSource = await import("gi://GtkSource").then((m) => m.default).catch(() => null)

function TextView(props: { code: string; langId: string }) {
  const style = useStyle({
    "background-color": "var(--view-bg-color)",
    "padding": "1em",
  })

  if (GtkSource) {
    const isDark = createBinding(Adw.StyleManager.get_default(), "dark")
    const scheme = GtkSource.StyleSchemeManager.get_default()

    return (
      <GtkSource.View editable={false} monospace class={style}>
        <GtkSource.Buffer
          text={props.code}
          highlightSyntax
          language={
            GtkSource.LanguageManager.get_default().get_language(props.langId) || void 0
          }
          styleScheme={isDark(
            (dark) => scheme.get_scheme(`Adwaita${dark ? "-dark" : ""}`)!,
          )}
        />
      </GtkSource.View>
    )
  }

  return (
    <Gtk.TextView editable={false} monospace class={style}>
      <Gtk.TextBuffer text={props.code} />
    </Gtk.TextView>
  )
}

export default function Code(props: {
  frame?: boolean
  lang?: string | null
  children: string
  onCopy: (code: string) => void
}) {
  const { lang, children: code } = props
  const langId = lang === "nu" ? "powershell" : lang || "text"

  let btn: Gtk.Button
  const [hovered, setHovered] = createState(false)

  return (
    <Gtk.Overlay
      name={lang || undefined}
      $={(self) => self.set_measure_overlay(btn, true)}
    >
      <Gtk.EventControllerMotion
        onEnter={() => setHovered(true)}
        onLeave={() => setHovered(false)}
      />
      {props.frame ? (
        <Gtk.Frame class="view">
          <Gtk.ScrolledWindow
            vscrollbarPolicy={Gtk.PolicyType.NEVER}
            hscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          >
            <TextView code={code} langId={langId} />
          </Gtk.ScrolledWindow>
        </Gtk.Frame>
      ) : (
        <TextView code={code} langId={langId} />
      )}
      {lang && (
        <Gtk.Label
          $type="overlay"
          label={lang}
          opacity={hovered((h) => (h ? 0 : 0.8))}
          halign={Gtk.Align.END}
          valign={Gtk.Align.START}
          marginTop={8}
          marginEnd={8}
        />
      )}
      <Gtk.Button
        $type="overlay"
        $={(self) => (btn = self)}
        css="margin:.5em;"
        opacity={hovered((h) => (h ? 1 : 0))}
        halign={Gtk.Align.END}
        valign={Gtk.Align.START}
        onClicked={() => props.onCopy(code)}
        iconName="edit-copy-symbolic"
        tooltipText={t("Copy to Clipboard")}
      />
    </Gtk.Overlay>
  )
}
