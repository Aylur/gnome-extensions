import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import EntryRow from "#/EntryRow"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { createRoot, createState, With } from "gnim"
import MessageRow from "./MessageRow"
import fetch from "gnim/fetch"

export default function SendMessageDialog(props: { window: Adw.PreferencesWindow }) {
  let dialog: Adw.Dialog

  const [sending, setSending] = createState(false)
  const [text, setText] = createState(_("Hi! I wanted to ask about..."))
  const [email, setEmail] = createState("")

  // please don't abuse this, I'm on a free resend tier
  async function sendEmail() {
    setSending(true)
    try {
      const res = await fetch(import.meta.EMAIL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.get(),
          message: text.get(),
        }),
      })

      if (!res.ok) {
        throw Error(await res.text())
      }

      props.window.add_toast(new Adw.Toast({ title: _("Message sent") }))
    } catch (error) {
      console.error(error)
      props.window.add_toast(new Adw.Toast({ title: _("Failed to send the message") }))
    } finally {
      setSending(false)
      dialog.close()
    }
  }

  return createRoot((dispose) => (
    <Adw.Dialog
      title={_("Send a direct message")}
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
            label={_("Cancel")}
          />
          <Gtk.Button
            $type="end"
            onClicked={() => void sendEmail()}
            class="suggested-action"
            sensitive={text((t) => t.length >= 100)}
            tooltipText={text((v) =>
              v.length < 100
                ? _("The message needs to be at least a 100 characters long")
                : "",
            )}
          >
            <With value={sending}>
              {(sending) =>
                sending ? (
                  <Gtk.Box spacing={3}>
                    <Adw.Spinner />
                    <Gtk.Label label={_("Sending")} />
                  </Gtk.Box>
                ) : (
                  <Adw.ButtonContent iconName="mail-unread-symbolic" label={_("Send")} />
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
              title={_("Email (Optional)")}
              explanation={_(
                "An optional email that I can respond to in case of a question.",
              )}
              onNotifyText={({ text }) => setEmail(text)}
              maxLength={100}
            />
            <MessageRow
              title={_("Message")}
              initalText={text.get()}
              onChanged={(text) => setText(text)}
            />
          </Adw.PreferencesGroup>
        </Gtk.Box>
      </Adw.ToolbarView>
    </Adw.Dialog>
  ))
}
