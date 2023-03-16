'use strict';

const { Adw, Gtk, Gio, GObject, GdkPixbuf } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Pages = Me.imports.pref.pages;
const { SwitchRow } = Me.imports.pref.widgets;

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
}

const ToggleRow = GObject.registerClass(
class ToggleRow extends Adw.ActionRow{
    _init(subpage, settingName, subtitle = ''){
        super._init({ title: subpage.title, subtitle: subtitle });

        const gswitch = new Gtk.Switch({
            active: subpage.settings.get_boolean(settingName),
            valign: Gtk.Align.CENTER,
        });
        subpage.settings.bind(
            settingName,
            gswitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(gswitch);
        const icon = Gtk.Image.new_from_icon_name('go-next-symbolic');
        this.add_suffix(icon);
        this.activatable_widget = icon;

        this.activatable = gswitch.active;
        gswitch.connect('notify::active',
            () => this.activatable = gswitch.active);

        this.connect('activated', () => {
            const window = this.get_root();
            window.present_subpage(subpage);
        });
    }
});

const AboutPage = GObject.registerClass(
class AboutPage extends Adw.PreferencesPage{
    _init(){
        super._init({
            title: _('About'),
            icon_name: 'info-symbolic'
        });

        const versionGroup = new Adw.PreferencesGroup();
        let versionRow = new Adw.ActionRow({ title: _('Verison:') });
        versionRow.add_suffix(new Gtk.Label({ valign: Gtk.Align.CENTER, label: `${Me.metadata.version}`}));
        versionGroup.add(versionRow);
        this.add(versionGroup);

        const credits = new Adw.PreferencesGroup({ title: _('Took code or inspiration from these projects') });
        this.add(credits);
        credits.add(this._addCredit(_('ArcMenu'), _('by andrew.zaech'), 'https://extensions.gnome.org/extension/3628/arcmenu'));
        credits.add(this._addCredit(_('Workspace Indicator'), _('by fmullner'), 'https://extensions.gnome.org/extension/21/workspace-indicator'));
        credits.add(this._addCredit(_('Workspace Indicator'), _('by fthx'), 'https://extensions.gnome.org/extension/3851/workspaces-bar'));
        credits.add(this._addCredit(_('Nano System Monitor'), _('by eeeee'), 'https://extensions.gnome.org/extension/5037/nano-system-monitor'));
        credits.add(this._addCredit(_('GNOME source code'), '', 'https://gitlab.gnome.org/GNOME/gnome-shell/-/tree/main/js/ui'));
        credits.add(this._addCredit(_('Unite'), _('by hardpixel'), 'https://extensions.gnome.org/extension/1287/unite/'));

        const donateGroup = new Adw.PreferencesGroup({ title: _('If you would like to support my work') });
        let donateRow = new Adw.ActionRow();
        donateGroup.add(donateRow);

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/media/prefs/kofi.png', -1, 50, true);
        let donateImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        donateRow.add_prefix(new Gtk.LinkButton({
            child: donateImage,
            uri: 'https://ko-fi.com/aylur',
        }));

        pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(Me.path + '/media/prefs/gnome-logo.png', -1, 50, true);
        donateImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        donateRow.add_suffix(new Gtk.Label({
            label: _('Also consider donating to'),
            valign: Gtk.Align.CENTER
        }));
        donateRow.add_suffix(new Gtk.LinkButton({
            child: donateImage,
            uri: 'https://www.gnome.org/support-gnome/donate',
        }));

        this.add(donateGroup);
    }

    _addCredit(name, by, link){
        let row = new Adw.ActionRow({ title: by });
        row.add_prefix(Gtk.LinkButton.new_with_label(link, name));
        return row;
    }
});

const MainPage = GObject.registerClass(
class MainPage extends Adw.PreferencesPage{
    _init(){
        super._init({
            title: _('Extensions'),
            icon_name: 'application-x-addon-symbolic',
        });

        const settings = ExtensionUtils.getSettings();
        const group = new Adw.PreferencesGroup();
        this.add(group);

        group.add(new ToggleRow(new Pages.BackgroundClockPage(settings), 'background-clock'));
        group.add(new ToggleRow(new Pages.BatteryBarPage(settings), 'battery-bar'));
        group.add(new ToggleRow(new Pages.DashBoardPage(settings), 'dash-board'));
        group.add(new ToggleRow(new Pages.DateMenuTweakPage(settings), 'date-menu-tweaks'));
        group.add(new ToggleRow(new Pages.DynamicPanelPage(settings), 'dynamic-panel'));
        group.add(new SwitchRow(_('Hide Window Headerbars'), settings, 'window-headerbar'));
        group.add(new ToggleRow(new Pages.NotificationIndicatorPage(settings), 'notification-indicator'));
        group.add(new ToggleRow(new Pages.MediaPlayerPage(settings), 'media-player'));
        group.add(new ToggleRow(new Pages.PowerMenuPage(settings), 'power-menu'));
        group.add(new ToggleRow(new Pages.QuickSettingsTweaksPage(settings), 'quick-settings-tweaks'));
        group.add(new ToggleRow(new Pages.WorkspaceIndicatorPage(settings), 'workspace-indicator'));
    }
});

function fillPreferencesWindow(window) {
    window.add(new MainPage());
    window.add(new AboutPage());
    window.search_enabled = true;
    window.can_navigate_back = true;
}
