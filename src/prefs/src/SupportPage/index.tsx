import { gettext as t } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import Gio from "gi://Gio"
import { For, createComputed, createRoot, createState } from "gnim"
import { fetch } from "gnim/fetch"
import { kofiIcon, paypalIcon } from "#data"
import { openUri, isValidUri } from "#/utils"
import { usePrefs } from "#/prefs"

type Donator = {
  image?: string
  name: string
  amount: string
  message?: string
}

function validate(res: unknown): Array<Donator> {
  if (!Array.isArray(res)) return []

  return res.filter((d) => {
    if ("image" in d && (typeof d.image !== "string" || !isValidUri(d.image)))
      return false
    if ("recurrence" in d && typeof d.recurrence !== "string") return false
    return (
      "name" in d &&
      typeof d.name === "string" &&
      "amount" in d &&
      typeof d.amount === "string"
    )
  })
}

function DonateAlert(props: { window: Adw.Window; url: string }) {
  return createRoot((dispose) => (
    <Adw.AlertDialog
      $={(self) => {
        self.add_response("ok", t("Open URL"))
        self.present(props.window)
      }}
      onResponse={(_, res) => {
        if (res === "ok") openUri(props.url)
        dispose()
      }}
      heading={t("Donations are not automatic")}
      body={t(
        "The management of the donation list is not an automatic process. If you want to appear in the list below, make sure to mention in the donation description that it is for the Gnofi Gnome extension.",
      )}
    />
  ))
}

export default function SupportPage() {
  const { window } = usePrefs()
  const [loading, setLoading] = createState(true)
  const [error, setError] = createState("")
  const [donators, setDonators] = createState(new Array<Donator>())
  const noDonators = createComputed(
    [loading, error, donators],
    (load, err, { length }) => !load && !err && length === 0,
  )

  void fetch(import.meta.DONATORS_LIST_URL)
    .then((out) => {
      if (out.status !== 200) throw Error(out.statusText)
      return out.json() as unknown
    })
    .then((json) => setDonators(validate(json)))
    .catch((err) => setError(`${err}`))
    .finally(() => setLoading(false))

  return (
    <Adw.PreferencesPage
      name="support"
      title={t("Support")}
      iconName="emote-love-symbolic"
    >
      <Adw.PreferencesGroup
        title={t("Support Gnofi")}
        description={t(
          "If you enjoy using Gnofi and would like to help support its continued development, consider making a donation.",
        )}
      >
        <Adw.ActionRow
          title={t("Sponsor me on GitHub")}
          activatable
          tooltipText="https://github.com/sponsors/aylur"
          onActivated={(self) => DonateAlert({ window, url: self.tooltipText })}
        >
          <Gtk.Image $type="prefix" pixelSize={24} iconName="github-symbolic" />
          <Gtk.Image iconName="adw-external-link-symbolic" />
        </Adw.ActionRow>
        <Adw.ActionRow
          title={t("Support me on Ko-fi")}
          activatable
          tooltipText={`https://ko-fi.com/aylur`}
          onActivated={(self) => DonateAlert({ window, url: self.tooltipText })}
        >
          <Gtk.Image $type="prefix" pixelSize={24} gicon={kofiIcon} />
          <Gtk.Image iconName="adw-external-link-symbolic" />
        </Adw.ActionRow>
        <Adw.ActionRow
          title={t("Donate via PayPal")}
          activatable
          tooltipText={`https://paypal.me/KristofDemeter`}
          onActivated={(self) => DonateAlert({ window, url: self.tooltipText })}
        >
          <Gtk.Image $type="prefix" pixelSize={24} gicon={paypalIcon} />
          <Gtk.Image iconName="adw-external-link-symbolic" />
        </Adw.ActionRow>
      </Adw.PreferencesGroup>
      <Adw.PreferencesGroup
        title={t("Donators")}
        description={noDonators((no) =>
          no
            ? t(
                "There have been no donations yet. Be the first one to appear on this list!",
              )
            : t("A huge thank you to these people who have supported Gnofi!"),
        )}
      >
        <Adw.Spinner $type="header-suffix" valign={Gtk.Align.CENTER} visible={loading} />
        <Adw.ActionRow
          visible={error((e) => !!e)}
          title={t("Failed to retrieve list of contributors")}
          subtitle={error}
        >
          <Gtk.Image $type="prefix" iconName="face-sad-symbolic" />
        </Adw.ActionRow>
        <For each={donators}>
          {({ image, name, message: recurrence, amount }) => (
            <Adw.ActionRow title={name} subtitle={recurrence}>
              {image && (
                <Gtk.Picture
                  $type="prefix"
                  marginTop={8}
                  marginBottom={8}
                  file={Gio.File.new_for_uri(image)}
                  css="border-radius:5px;"
                />
              )}
              <Gtk.Label label={amount} />
            </Adw.ActionRow>
          )}
        </For>
        <Adw.ActionRow
          visible={noDonators}
          title={t("This could be your name")}
          subtitle={t("Possibly a monthly donator")}
        >
          <Gtk.Image $type="prefix" pixel_size={32} iconName="avatar-default-symbolic" />
          <Gtk.Label label="10$" />
        </Adw.ActionRow>
      </Adw.PreferencesGroup>
      <Adw.PreferencesGroup>
        <Gtk.Label
          vexpand
          valign={Gtk.Align.END}
          class="dimmed"
          wrap
          label={t(
            "If you have donated and I haven't yet added you to this list, contact me.",
          )}
        />
      </Adw.PreferencesGroup>
    </Adw.PreferencesPage>
  )
}
