import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import EntryRow from "#/EntryRow"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { createRoot, createState, With } from "gnim"
import MessageRow from "./MessageRow"
import fetch from "gnim/fetch"
import Spinner from "#/Spinner"

export default function SendMessageDialog(props: { window: Adw.PreferencesWindow }) {
  let dialog: Adw.Dialog

  const [sending, setSending] = createState(false)
  const [text, setText] = createState(t("Hi! I wanted to ask about..."))
  const [email, setEmail] = createState("")

  async function sendEmail() {
    setSending(true)
    try {
      const res = await fetch("https://inbox.aylur.dev/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: "Gnofi",
          subject: "Gnofi",
          from: email.peek(),
          text: text.peek(),
        }),
      })

      if (!res.ok) {
        throw Error(await res.text())
      }

      props.window.add_toast(new Adw.Toast({ title: t("Message sent") }))
    } catch (error) {
      console.error(error)
      props.window.add_toast(new Adw.Toast({ title: t("Failed to send the message") }))
    } finally {
      setSending(false)
      dialog.close()
    }
  }

  return createRoot((dispose) => (
    <Adw.Dialog
      title={t("Send a direct message")}
      onClosed={dispose}
      $={(self) => (dialog = self).present(props.window)}
      contentWidth={420}
    >
      <Adw.ToolbarView>
        <Adw.HeaderBar
          showEndTitleButtons={false}
          showStartTitleButtons={false}
          $type="top"
        >
          <Gtk.Button
            onClicked={() => dialog.close()}
            $type="start"
            label={t("Cancel")}
          />
          <Gtk.Button
            $type="end"
            onClicked={() => void sendEmail()}
            class="suggested-action"
            sensitive={text((t) => t.length >= 100)}
            tooltipText={text((v) =>
              v.length < 100
                ? t("The message needs to be at least a 100 characters long")
                : "",
            )}
          >
            <With value={sending}>
              {(sending) =>
                sending ? (
                  <Gtk.Box spacing={3}>
                    <Spinner />
                    <Gtk.Label label={t("Sending")} />
                  </Gtk.Box>
                ) : (
                  <Adw.ButtonContent iconName="mail-unread-symbolic" label={t("Send")} />
                )
              }
            </With>
          </Gtk.Button>
        </Adw.HeaderBar>
        <Gtk.Box
          marginBottom={6}
          marginEnd={6}
          marginStart={6}
          orientation={Gtk.Orientation.VERTICAL}
        >
          <Adw.PreferencesGroup>
            <EntryRow
              title={t("Email (Optional)")}
              explanation={t(
                "An optional email that I can respond to in case of a question.",
              )}
              onNotifyText={({ text }) => setEmail(text.slice(0, 100))}
              maxLength={Adw.MINOR_VERSION >= 6 ? 100 : undefined}
            />
            <MessageRow
              title={t("Message")}
              initalText={text.peek()}
              onChanged={(text) => setText(text)}
            />
          </Adw.PreferencesGroup>
        </Gtk.Box>
      </Adw.ToolbarView>
    </Adw.Dialog>
  ))
}
