import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js"
import Adw from "gi://Adw"
import Gtk from "gi://Gtk"
import { openUri } from "#/utils"
import { gnofiIcon } from "#data"
import { usePrefs } from "#/prefs"
import { useSettings } from "~schemas"
import SendMessageDialog from "./SendMessageDialog"
import LicensePage from "./LicensePage"
import ChangelogPage from "./ChangelogPage"

export default function AboutPage() {
  const { showHiddenOptions, setShowHiddenOptions } = useSettings()
  const { window, version } = usePrefs()

  function toggleHiddenOptions() {
    const shown = !showHiddenOptions.get()
    setShowHiddenOptions(shown)

    window.add_toast(
      new Adw.Toast({
        title: shown
          ? _("Hidden options are now visible")
          : _("Hidden options are now hidden"),
        timeout: 2,
      }),
    )
  }

  return (
    <Adw.PreferencesPage name="about" title={_("About")} iconName="help-about-symbolic">
      <Adw.PreferencesGroup>
        <Gtk.Box halign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
          <Gtk.Image pixelSize={158} marginBottom={6} gicon={gnofiIcon} />
          <Gtk.Label class="title-1" label={_("Gnofi")} />
          <Gtk.Label
            wrap
            halign={Gtk.Align.CENTER}
            label={_("An extensible launcher, picker, search and command palette")}
          />
          <Gtk.Button
            class="pill"
            marginTop={12}
            halign={Gtk.Align.CENTER}
            css="padding: 3px 18px; color: var(--accent-color);"
            tooltipText={_("Toggle Hidden Options")}
            label={
              version == null
                ? _('Development version "%s"').format(import.meta.VERSION)
                : _("Version %d").format(version)
            }
            onClicked={toggleHiddenOptions}
          />
        </Gtk.Box>
      </Adw.PreferencesGroup>

      <Adw.PreferencesGroup>
        <Adw.ActionRow
          title={_("Report an Issue")}
          subtitle={_("Or request a feature")}
          activatable
          tooltipText={import.meta.BUGS_URL}
          onActivated={() => openUri(import.meta.BUGS_URL)}
        >
          <Gtk.Image $type="prefix" pixelSize={24} iconName="github-symbolic" />
          <Gtk.Image iconName="adw-external-link-symbolic" />
        </Adw.ActionRow>

        <Adw.ActionRow
          title={_("Source Code")}
          subtitle={_("Don't forget to leave a star on the repo")}
          activatable
          tooltipText={import.meta.GIT_URL}
          onActivated={() => openUri(import.meta.GIT_URL)}
        >
          <Gtk.Image $type="prefix" pixelSize={24} iconName="git-symbolic" />
          <Gtk.Image iconName="adw-external-link-symbolic" />
        </Adw.ActionRow>

        <Adw.ActionRow
          title={_("Legal")}
          subtitle={_("Licensed under the GNU GPL v3.0")}
          activatable
          onActivated={() => LicensePage({ window })}
        >
          <Gtk.Image
            $type="prefix"
            pixelSize={24}
            iconName="x-office-document-symbolic"
          />
          <Gtk.Image
            iconName="adw-expander-arrow-symbolic"
            css="transform:rotate(90deg);"
          />
        </Adw.ActionRow>

        <Adw.ActionRow
          title={_("Changelog")}
          subtitle={_("See what's new and what changed")}
          activatable
          onActivated={() => ChangelogPage({ window })}
        >
          <Gtk.Image $type="prefix" pixelSize={24} iconName="view-list-bullet-symbolic" />
          <Gtk.Image
            iconName="adw-expander-arrow-symbolic"
            css="transform:rotate(90deg);"
          />
        </Adw.ActionRow>
      </Adw.PreferencesGroup>

      <Adw.PreferencesGroup
        visible={showHiddenOptions((show) => show || !!import.meta.EMAIL_API)}
        title={_("Leave Feedback")}
        description={_(
          "Please prefer using the GitHub issue tracker if you have a GitHub account.",
        )}
      >
        {import.meta.EMAIL_API ? (
          <Adw.ButtonRow
            startIconName="mail-unread-symbolic"
            title={_("Send a direct message")}
            onActivated={() => SendMessageDialog({ window })}
          />
        ) : (
          <Adw.PreferencesRow sensitive={false}>
            <Gtk.Label
              marginTop={4}
              marginBottom={4}
              halign={Gtk.Align.CENTER}
              justify={Gtk.Justification.CENTER}
              wrap
              label={_(
                "Sending direct messages is only supported from the official https://extensions.gnome.org/ distributon.",
              )}
            />
          </Adw.PreferencesRow>
        )}
      </Adw.PreferencesGroup>
      {/* TODO: list of other extensions */}
    </Adw.PreferencesPage>
  )
}
