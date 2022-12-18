'use strict';

const { Adw, Gio, Gtk, GObject, GLib } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const ByteArray = imports.byteArray;
const { SpinButtonRow, EntryRow, DropDownRow,
        SwitchRow, ColorRow, ExpanderRow,
        PositionRow, FileChooserButton, HotkeyDialog } = Me.imports.pref.widgets;

const { wsNamesGroup } = Me.imports.pref.workspaces; 

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

const MEDIA_SUBTITLE = _("Doesn't work with every media player");
const MEDIA_SUBTITLE2 = _("Doesn't work on every style");

const SubPage = GObject.registerClass(
class SubPage extends Gtk.Box{
    _init(title, settings) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
        });
        this.settings = settings;
        this.title = title;

        this.headerBar = new Adw.HeaderBar({
            title_widget: new Adw.WindowTitle({
                title: title,
            }),
            decoration_layout: ''
        });
        this.append(this.headerBar);
        let backButton = new Gtk.Button({
            icon_name: 'go-previous-symbolic',
            tooltip_text: _('Back'),
            css_classes: ['flat'],
        });
        backButton.connect('clicked', () => {
            const window = this.get_root();
            window.close_subpage();
        });
        this.headerBar.pack_start(backButton);

        this.page = new Adw.PreferencesPage();
        this.append(this.page);
    }

    add(widget){ this.page.add(widget) }
});

var BatteryBarPage = GObject.registerClass(
class BatteryBarPage extends SubPage{
    _init(settings){
        super._init(_('Battery Bar'), settings);

        const group = new Adw.PreferencesGroup({ title: _('Battery Bar') });
        this.add(group);

        group.add(new PositionRow(_('Position'), settings, 'battery-bar-position', 'battery-bar-offset'));

        let iconExpanderRow = new ExpanderRow(_('Show Icon'), settings, 'battery-bar-show-icon');
        iconExpanderRow.add_row(new DropDownRow(_('Icon Position'), settings, 'battery-bar-icon-position', [_('Left'), _('Right')]));

        let labelExpanderRow = new ExpanderRow(_('Show Percentage'), settings, 'battery-bar-show-percentage');
        labelExpanderRow.add_row(new ColorRow(_('Font Color Front'), settings, 'battery-bar-font-color'));
        labelExpanderRow.add_row(new ColorRow(_('Font Color Background'), settings, 'battery-bar-font-bg-color'));

        group.add(iconExpanderRow);
        group.add(labelExpanderRow);
        group.add(new SpinButtonRow(_('Width'), settings, 'battery-bar-width', 50, 800, 10));
        group.add(new SpinButtonRow(_('Height'), settings, 'battery-bar-height', 1, 100, 1));
        group.add(new SpinButtonRow(_('Bar Roundness'), settings, 'battery-bar-roundness', 1, 100, 1));
        group.add(new SpinButtonRow(_('Low Threshold'), settings, 'battery-bar-low-threshold', 0, 100, 5));

        let colorExpander = new Adw.ExpanderRow({ title: _('Bar Colors') });
        colorExpander.add_row(new ColorRow(_('Color'), settings, 'battery-bar-color'));
        colorExpander.add_row(new ColorRow(_('Charging Color'), settings, 'battery-bar-charging-color'));
        colorExpander.add_row(new ColorRow(_('Low Color'), settings, 'battery-bar-low-color'));
        colorExpander.add_row(new ColorRow(_('Background Color'), settings, 'battery-bar-bg-color'));
        group.add(colorExpander);
    }
});

var DashBoardPage = GObject.registerClass(
class DashBoardPage extends SubPage{
    _init(settings){
        super._init(_('Dash Board'), settings);
    
        const buttonGroup = new Adw.PreferencesGroup({ title: _('Panel Button') });
        this.add(buttonGroup);

        buttonGroup.add(new SwitchRow(_('Hide Activities Button'), settings, 'dash-hide-activities'));
        let enableExpander = new ExpanderRow(_('Enable Panel Button'), settings, 'dash-button-enable');
        enableExpander.add_row(new PositionRow(_('Position'), settings, 'dash-button-position', 'dash-button-offset'));
        let showIcon = new SwitchRow(_('Show Icon'), settings, 'dash-button-show-icon');
        showIcon.add_suffix(new FileChooserButton(settings, 'dash-button-icon-path'));
        enableExpander.add_row(showIcon);
        enableExpander.add_row(new EntryRow(_('Label'), settings, 'dash-button-label'));
        buttonGroup.add(enableExpander);

        const dashGroup = new Adw.PreferencesGroup({ title: _('Dash') });
        this.add(dashGroup);

        let shortcutRow = new Adw.ActionRow({ title: _('Shortcut Hotkey') });
        let shortcutCell = new Gtk.ShortcutsShortcut({ valign: Gtk.Align.CENTER });
        shortcutCell.accelerator = settings.get_strv('dash-shortcut').toString();
        let hotkeyButton = new Gtk.Button({
            label: _('Set Hotkey'),
            valign: Gtk.Align.CENTER,
        });
        hotkeyButton.connect('clicked', () => {
            let dialog = new HotkeyDialog(settings, this);
            dialog.show();
            dialog.connect('response', (_w, response) => {
                if(response === Gtk.ResponseType.APPLY) {
                    settings.set_strv('dash-shortcut', [dialog.resultsText]);
                    shortcutCell.accelerator = dialog.resultsText;
                }
                dialog.destroy();
            });
        });
        shortcutRow.add_suffix(shortcutCell);
        shortcutRow.add_suffix(hotkeyButton);

        dashGroup.add(shortcutRow);
        dashGroup.add(new DropDownRow(_('Layout'), settings, 'dash-layout', ['1', '2', '3',], _('Send me your layout ideas and I will add it.')));

        let appBoxExpander = new Adw.ExpanderRow({ title: _('App Launcher') });
        appBoxExpander.add_row(new SpinButtonRow(_('Rows'), settings, 'dash-apps-rows', 1, 5, 1));
        appBoxExpander.add_row(new SpinButtonRow(_('Columns'), settings, 'dash-apps-cols', 1, 5, 1));
        appBoxExpander.add_row(new SpinButtonRow(_('Icon Size'), settings, 'dash-app-icon-size', 16, 64, 2));
        dashGroup.add(appBoxExpander);

        let levelsExpander = new Adw.ExpanderRow({ title: _('System Levels') });
        levelsExpander.add_row(new SwitchRow(_('Battery'), settings, 'dash-levels-show-battery'));
        levelsExpander.add_row(new SwitchRow(_('Storage'), settings, 'dash-levels-show-storage'));
        levelsExpander.add_row(new SwitchRow(_('CPU'), settings, 'dash-levels-show-cpu'));
        levelsExpander.add_row(new SwitchRow(_('RAM'), settings, 'dash-levels-show-ram'));
        levelsExpander.add_row(new SwitchRow(_('Temperature'), settings, 'dash-levels-show-temp'));
        dashGroup.add(levelsExpander);

        let mediaExpander = new Adw.ExpanderRow({ title: _('Media Player') });
        mediaExpander.add_row(new EntryRow(_('Prefer'), settings, 'dash-media-prefer'));
        mediaExpander.add_row(new DropDownRow(_('Style'), settings, 'dash-media-style', [_('Normal'), _('Label on Cover'), _('Label on Cover +Vertical Controls'), _('Full')]));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Width'), settings, 'dash-media-cover-width', 100, 800, 5));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Height'), settings, 'dash-media-cover-height', 100, 800, 5));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Roundness'), settings, 'dash-media-cover-roundness', 0, 48, 1));
            let textExpander = new ExpanderRow(_('Show Title'), settings, 'date-menu-media-show-text');
            textExpander.add_row(new DropDownRow(_('Title Align'), settings, 'date-menu-media-text-align', [_('Left'), _('Center'), _('Right')]));
            textExpander.add_row(new DropDownRow(_('Title Position'), settings, 'date-menu-media-text-position', [_('Top'), _('Bot')], MEDIA_SUBTITLE2));
            mediaExpander.add_row(textExpander);
        mediaExpander.add_row(new SwitchRow(_('Show Volume Slider'), settings, 'dash-media-show-volume', MEDIA_SUBTITLE));
        mediaExpander.add_row(new SwitchRow(_('Show Loop and Shuffle'), settings, 'dash-media-show-loop-shuffle', MEDIA_SUBTITLE));
        dashGroup.add(mediaExpander);

        dashGroup.add(new Adw.ActionRow({
            title: _('Web Links'),
            subtitle: _(`You can change the links through dconf editor.\nIf you want your own icon: find an svg and name it theNameYouGaveItInDconf-symbolic.svg.`)
        }));
    }
});

var DateMenuTweakPage = GObject.registerClass(
class DateMenuTweakPage extends SubPage{
    _init(settings){
        super._init(_('Date Menu Tweaks'), settings);

        const menuGroup = new Adw.PreferencesGroup({ title: _('Date Menu Tweaks') });
        this.add(menuGroup);
        menuGroup.add(new SwitchRow(_('Mirrored'), settings, 'date-menu-mirror'));
        menuGroup.add(new SwitchRow(_('Hide Notifications'), settings, 'date-menu-hide-notifications'));
        menuGroup.add(new SwitchRow(_('Hide Stock Mpris'), settings, 'date-menu-hide-stock-mpris', _('Hides the media players in the notification list')));

        const customMenuGroup = new Adw.PreferencesGroup({ title: _('Custom Menu') });
        this.add(customMenuGroup);

        let expander = new ExpanderRow(_('Enable Custom Menu'), settings, 'date-menu-custom-menu');
        expander.add_row(new SwitchRow(_('Show User Icon'), settings, 'date-menu-show-user'));
        expander.add_row(new SwitchRow(_('Show Events'), settings, 'date-menu-show-events'));
        expander.add_row(new SwitchRow(_('Show Clocks'), settings, 'date-menu-show-clocks'));
        expander.add_row(new SwitchRow(_('Show Weather'), settings, 'date-menu-show-weather'));

        let levelsExpander = new ExpanderRow(_('Show System Levels'), settings, 'date-menu-show-system-levels')
        levelsExpander.add_row(new SwitchRow(_('Battery'), settings, 'date-menu-levels-show-battery'));
        levelsExpander.add_row(new SwitchRow(_('Storage'), settings, 'date-menu-levels-show-storage'));
        levelsExpander.add_row(new SwitchRow(_('CPU'), settings, 'date-menu-levels-show-cpu'));
        levelsExpander.add_row(new SwitchRow(_('RAM'), settings, 'date-menu-levels-show-ram'));
        levelsExpander.add_row(new SwitchRow(_('Temperature'), settings, 'date-menu-levels-show-temp'));
        expander.add_row(levelsExpander);

        let mediaExpander = new ExpanderRow(_('Show Media Player'), settings, 'date-menu-show-media');
        mediaExpander.add_row(new EntryRow(_('Prefer'), settings, 'date-menu-media-prefer'));
        mediaExpander.add_row(new DropDownRow(_('Style'), settings, 'date-menu-media-style', [_('Normal'), _('Label on Cover'), _('Label on Cover +Vertical Controls'), _('Full')]));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Width'), settings, 'date-menu-media-cover-width', 100, 500, 5));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Height'), settings, 'date-menu-media-cover-height', 100, 500, 5));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Roundness'), settings, 'date-menu-media-cover-roundness', 0, 48, 1));
            let textExpander = new ExpanderRow(_('Show Title'), settings, 'date-menu-media-show-text');
            textExpander.add_row(new DropDownRow(_('Title Align'), settings, 'date-menu-media-text-align', [_('Left'),_('Center'),_('Right')]));
            textExpander.add_row(new DropDownRow(_('Title Position'), settings, 'date-menu-media-text-position', [_('Top'),_('Bot')], MEDIA_SUBTITLE2));
            mediaExpander.add_row(textExpander);
        mediaExpander.add_row(new SwitchRow(_('Show Volume Slider'), settings, 'date-menu-media-show-volume', MEDIA_SUBTITLE));
        mediaExpander.add_row(new SwitchRow(_('Show Loop and Shuffle'), settings, 'date-menu-media-show-loop-shuffle', MEDIA_SUBTITLE));
        expander.add_row(mediaExpander);

        customMenuGroup.add(expander);

        const buttonGroup = new Adw.PreferencesGroup({ title: _('Clock Button') });
        this.add(buttonGroup);
        buttonGroup.add(new PositionRow(_('Position'), settings, 'date-menu-position', 'date-menu-offset'));
        buttonGroup.add(new SwitchRow(_('Remove Padding'), settings, 'date-menu-remove-padding'));
        buttonGroup.add(new DropDownRow(_('Indicator Position'), settings, 'date-menu-indicator-position', [_('Left'), _('Right'), 'Hide']));
        buttonGroup.add(new EntryRow(_('Format'), settings, 'date-menu-date-format'));
        let textBox = new Gtk.Box();
        textBox.append(new Gtk.Label({
            xalign: 0,
            label: _(`
            %M - minutes 00-59
            %H - hour 00-23
            %I - hour 01-12
            %k - hour 0-23
            %l - hour 1-12
            %p - AM PM
            %P - am pm

            %C - century 00-99
            %j - day of year 001-366`)
        }));
        textBox.append(new Gtk.Label({
            xalign: 0,
            label: _(`
            %a - weekday abr
            %A - weekday name
            %b - monthname abr
            %B - monthname name
            %Y - year 2000
            %d - day 01-31
            %e - day 1-31
            %m - month 01-12`)
        }));
        buttonGroup.add(textBox);
    }
});

var MediaPlayerPage = GObject.registerClass(
class MediaPlayerPage extends SubPage{
    _init(settings){
        super._init(_('Media Player'), settings);

        const buttonGroup = new Adw.PreferencesGroup({ title: _('Panel Button')});
        this.add(buttonGroup);

        let trackBtnExpander = new ExpanderRow(_('Track Button'), settings, 'media-player-enable-track');
        trackBtnExpander.add_row(new PositionRow(_('Position'), settings, 'media-player-position', 'media-player-offset'));
        trackBtnExpander.add_row(new SpinButtonRow(_('Max Width'), settings, 'media-player-max-width', 0, 1200, 10, _('0 to unset')));
        let controlsExpander = new ExpanderRow(_('Controls'), settings, 'media-player-enable-controls');
        controlsExpander.add_row(new PositionRow(_('Position'), settings, 'media-player-controls-position', 'media-player-controls-offset'));
        buttonGroup.add(trackBtnExpander);
        buttonGroup.add(controlsExpander);

        const playerGroup = new Adw.PreferencesGroup({ title: _('Player') });
        this.add(playerGroup);

        this.cachePath = `${Me.dir.get_path()}/media/mpris-cache`;
        this.clearRow = new Adw.ActionRow({ title: _('Cache') });
        let clearBtn = Gtk.Button.new_with_label(_('Cache'));
        clearBtn.valign = Gtk.Align.CENTER;
        clearBtn.connect('clicked', () => this._clearCache());
        this.clearRow.add_suffix(clearBtn);
        playerGroup.add(this.clearRow);
        this._cacheSize();
        
        playerGroup.add(new EntryRow(_('Prefer'), settings, 'media-player-prefer', 'It is the players d-bus name. e.g: Amberol, firefox, spotify.'));
        playerGroup.add(new DropDownRow(_('Style'), settings, 'media-player-style', [_('Normal'), _('Horizontal'), _('Compact'), _('Label on Cover'), _('Label on Cover +Vertical Controls'), _('Full')]));
        playerGroup.add(new SpinButtonRow(_('Cover Roundness'), settings, 'media-player-cover-roundness', 1, 99, 1));
        playerGroup.add(new SpinButtonRow(_('Cover Width'), settings, 'media-player-cover-width', 50, 500, 2));
        playerGroup.add(new SpinButtonRow(_('Cover Height'), settings, 'media-player-cover-height', 50, 500, 2));
        let textExpander = new ExpanderRow(_('Show Title'), settings, 'media-player-show-text');
        textExpander.add_row(new DropDownRow(_('Title Align'), settings, 'media-player-text-align', [_('Left'),_('Center'),_('Right')]));
        textExpander.add_row(new DropDownRow(_('Title Position'), settings, 'media-player-text-position', [_('Top'),_('Bot')], MEDIA_SUBTITLE2));
        playerGroup.add(textExpander);
        playerGroup.add(new SwitchRow(_('Show Volume Slider'), settings, 'media-player-show-volume', MEDIA_SUBTITLE));
        playerGroup.add(new SwitchRow(_('Show Loop and Shuffle'), settings, 'media-player-show-loop-shuffle', MEDIA_SUBTITLE));
    }

    _cacheSize(){
        let [ok, out, err, exit] = GLib.spawn_command_line_sync(`du -h ${this.cachePath}`);
        let line = '';
        if(ok) line = ByteArray.toString(out).split(/\s+/)[0];
        if(line == '0') line = _('Empty');
        this.clearRow.set_subtitle(line);
    }

    _clearCache(){
        GLib.spawn_command_line_sync(`rm -r ${this.cachePath}`);
        this.clearRow.set_subtitle(_('Cleared!'));
    }
});

var PowerMenuPage = GObject.registerClass(
class PowerMenuPage extends SubPage{
    _init(settings){
        super._init(_('Power Menu'), settings);

        const group = new Adw.PreferencesGroup({ title: _('Power Menu') });
        this.add(group);

        group.add(new PositionRow(_('Position'), settings, 'power-menu-position', 'power-menu-offset'));
        group.add(new DropDownRow(_('Layout'), settings, 'power-menu-layout', ["2x2", "1x4"]));
        group.add(new DropDownRow(_('Label Position'), settings, 'power-menu-label-position', [_('Inside'), _('Outside'), _('Hidden')]));
        group.add(new SpinButtonRow(_('Button Roundness'), settings, 'power-menu-button-roundness', 0, 99, 2));
        group.add(new SpinButtonRow(_('Icon Size'), settings, 'power-menu-icon-size', 0, 300, 2));
        group.add(new SpinButtonRow(_('Icon Padding'), settings, 'power-menu-icon-padding', 0, 150, 2));
        group.add(new SpinButtonRow(_('Spacing'), settings, 'power-menu-dialog-spacing', 0, 150, 2));

        let dialogExpander = new ExpanderRow(_('Dialog Background'), settings, 'power-menu-dialog-show-bg');
        dialogExpander.add_row(new SpinButtonRow(_('Dialog Padding'), settings, 'power-menu-dialog-padding', 0, 150, 2));
        dialogExpander.add_row(new SpinButtonRow(_('Dialog Roundness'), settings, 'power-menu-dialog-roundness', 0, 100, 1));

        group.add(dialogExpander);
    }
});

var WorkspaceIndicatorPage = GObject.registerClass(
class WorkspaceIndicatorPage extends SubPage{
    _init(settings){
        super._init(_('Workspace Indicator'), settings);

        const group = new Adw.PreferencesGroup({ title: _('Panel Widget') });
        this.add(group);

        group.add(new PositionRow(_('Position'), settings, 'workspace-indicator-position', 'workspace-indicator-offset'));
        group.add(new SwitchRow(_('Show Names'), settings, 'workspace-indicator-show-names'));

        this.add(new wsNamesGroup());
    }
});

var NotificationIndicatorPage = GObject.registerClass(
class NotificationIndicatorPage extends SubPage{
    _init(settings){
        super._init(_('Notification Indicator'), settings);

        const group = new Adw.PreferencesGroup({ title: _('Notification Indicator') });
        this.add(group);

        group.add(new DropDownRow(_('Position'), settings, 'notification-indicator-position', [_('Left'),_('Center'),_('Right'), _('Setting Indicators')]));
        group.add(new SpinButtonRow(_('Offset'), settings, 'notification-indicator-offset', 0, 16, 1));
        group.add(new SwitchRow(_('Hide on Zero'), settings, 'notification-indicator-hide-on-zero'));
        group.add(new SpinButtonRow(_('Menu Width'), settings, 'notification-indicator-menu-width', 100, 1000, 10));
        group.add(new SwitchRow(_('Hide Counter'), settings, 'notification-indicator-hide-counter'));
        group.add(new SwitchRow(_('Show Do Nut Disturb'), settings, 'notification-indicator-show-dnd'));
    }
});
    
var BackgroundClockPage = GObject.registerClass(
class BackgroundClockPage extends SubPage{
    _init(settings){
        super._init(_('Background Clock'), settings);

        const group = new Adw.PreferencesGroup({ title: _('Background Clock') });
        this.add(group);
        
        group.add(new DropDownRow(_('Position'), settings, 'background-clock-position',
        [_('Top Left'), _('Top Center'), _('Top Right'),
        _('Middle Left'), _('Middle Center'), _('Middle Right'),
        _('Bottom Left'), _('Bottom Center'), _('Bottom Right')]));

        group.add(new SpinButtonRow(_('X Offset'), settings, 'background-clock-x-offset', 0, 500, 5));
        group.add(new SpinButtonRow(_('Y Offset'), settings, 'background-clock-y-offset', 0, 500, 5));

        let clockExpander = new ExpanderRow(_('Clock'), settings, 'background-clock-enable-clock');
        clockExpander.add_row(new EntryRow(_('Clock Format'), settings, 'background-clock-clock-format'));
        clockExpander.add_row(new SpinButtonRow(_('Clock Size'), settings, 'background-clock-clock-size', 1, 200, 2));
        clockExpander.add_row(this._addCustomFontRow(settings, 'background-clock-clock-custom-font', 'background-clock-clock-font'));
        clockExpander.add_row(new ColorRow(_('Clock Color'), settings, 'background-clock-clock-color'));
        clockExpander.add_row(new SpinButtonRow(_('Text Shadow x Offset'), settings, 'background-clock-clock-shadow-x', 0, 50, 1));
        clockExpander.add_row(new SpinButtonRow(_('Text Shadow y Offset'), settings, 'background-clock-clock-shadow-y', 0, 50, 1));
        clockExpander.add_row(new SpinButtonRow(_('Text Shadow Blur Amount'), settings, 'background-clock-clock-shadow-blur', 0, 50, 1));
        clockExpander.add_row(new SpinButtonRow(_('Text Shadow Width'), settings, 'background-clock-clock-shadow-width', 0, 50, 1));
        clockExpander.add_row(new ColorRow(_('Text Shadow Color'), settings, 'background-clock-clock-shadow-color'));

        let dateExpander = new ExpanderRow(_('Date'), settings, 'background-clock-enable-date');
        dateExpander.add_row(new EntryRow(_('Date Format'), settings, 'background-clock-date-format'));
        dateExpander.add_row(new SpinButtonRow(_('Date Size'), settings, 'background-clock-date-size', 1, 200, 2));
        dateExpander.add_row(this._addCustomFontRow(settings, 'background-clock-date-custom-font', 'background-clock-date-font'));
        dateExpander.add_row(new ColorRow(_('Date Color'), settings, 'background-clock-date-color'));
        dateExpander.add_row(new SpinButtonRow(_('Text Shadow x Offset'), settings, 'background-clock-date-shadow-x', 0, 50, 1));
        dateExpander.add_row(new SpinButtonRow(_('Text Shadow y Offset'), settings, 'background-clock-date-shadow-y', 0, 50, 1));
        dateExpander.add_row(new SpinButtonRow(_('Text Shadow Blur Amount'), settings, 'background-clock-date-shadow-blur', 0, 50, 1));
        dateExpander.add_row(new SpinButtonRow(_('Text Shadow Width'), settings, 'background-clock-date-shadow-width', 0, 50, 1));
        dateExpander.add_row(new ColorRow(_('Text Shadow Color'), settings, 'background-clock-date-shadow-color'));

        let styleExpander = new Adw.ExpanderRow({ title: _('Widget Style') });
        styleExpander.add_row(new ColorRow(_('Background Color'), settings, 'background-clock-bg-color'));
        styleExpander.add_row(new SpinButtonRow(_('Padding'), settings, 'background-clock-bg-padding', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow(_('Border Size'), settings, 'background-clock-bg-border-size', 0, 100, 1));
        styleExpander.add_row(new ColorRow(_('Border Color'), settings, 'background-clock-bg-border-color'));
        styleExpander.add_row(new SpinButtonRow(_('Roundness'), settings, 'background-clock-bg-border-radius', 0, 100, 1));
        styleExpander.add_row(new SwitchRow(_('Shadow Inset'), settings, 'background-clock-bg-shadow-inset'));
        styleExpander.add_row(new SpinButtonRow(_('Shadow x Offset'), settings, 'background-clock-bg-shadow-x', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow(_('Shadow y Offset'), settings, 'background-clock-bg-shadow-y', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow(_('Shadow Blur Amount'), settings, 'background-clock-bg-shadow-blur', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow(_('Shadow Width'), settings, 'background-clock-bg-shadow-width', 0, 100, 1));
        styleExpander.add_row(new ColorRow(_('Shadow Color'), settings, 'background-clock-bg-shadow-color'));

        group.add(clockExpander);
        group.add(dateExpander);
        group.add(styleExpander);

        let textBox = new Gtk.Box();
        textBox.append(new Gtk.Label({
            xalign: 0,
            label: _(`
            Date Formats:

            %M - minutes 00-59
            %H - hour 00-23
            %I - hour 01-12
            %k - hour 0-23
            %l - hour 1-12
            %p - AM PM
            %P - am pm

            %C - century 00-99
            %j - day of year 001-366`)
        }));
        textBox.append(new Gtk.Label({
            xalign: 0,
            label: _(`
            %a - weekday abr
            %A - weekday name
            %b - monthname abr
            %B - monthname name
            %Y - year 2000
            %d - day 01-31
            %e - day 1-31
            %m - month 01-12`)
        }));

        group.add(textBox);
   }

   _addCustomFontRow(settings, switchName, settingName){
        let row = new SwitchRow(_('Custom Font'), settings, switchName);
        let fontBtn = new Gtk.FontButton({
            valign: Gtk.Align.CENTER,
            use_size: false,
            use_font: true,
            level: Gtk.FontChooserLevel.FAMILY,
            font: settings.get_string(settingName)
        });
        fontBtn.connect('font-set', () => {
            let font = fontBtn.get_font_family().get_name();
            settings.set_string(settingName, font);
        });
        row.add_suffix(fontBtn);
        return row;
   }
});

var QuickSettingsTweaksPage = GObject.registerClass(
class QuickSettingsTweaksPage extends SubPage{
    _init(settings){
        super._init(_('Quick Settings Tweaks'), settings);

        const group = new Adw.PreferencesGroup({ title: _('Quick Settings Tweaks') });
        this.add(group);

        group.add(new SpinButtonRow(_('Menu Width'), settings, 'quick-settings-menu-width', 250, 500, 5));
        group.add(new DropDownRow(_('Style'), settings, 'quick-settings-style', [_('Stock'), _('Normal'), _('Compact'), _('Separated')]));
        group.add(new SwitchRow(_('Adjust Roundness'), settings, 'quick-settings-adjust-roundness'));
        group.add(new SwitchRow(_('Show Notifications'), settings, 'quick-settings-show-notifications'));
        
        let levelsExpander = new ExpanderRow(_('Show System Levels'), settings, 'quick-settings-show-system-levels');
        levelsExpander.add_row(new SwitchRow(_('Battery'), settings, 'quick-settings-levels-show-battery'));
        levelsExpander.add_row(new SwitchRow(_('Storage'), settings, 'quick-settings-levels-show-storage'));
        levelsExpander.add_row(new SwitchRow(_('CPU'), settings, 'quick-settings-levels-show-cpu'));
        levelsExpander.add_row(new SwitchRow(_('RAM'), settings, 'quick-settings-levels-show-ram'));
        levelsExpander.add_row(new SwitchRow(_('Temperature'), settings, 'quick-settings-levels-show-temp'));
        group.add(levelsExpander);
        
        let mediaExpander = new ExpanderRow(_('Show Media'), settings, 'quick-settings-show-media');
        let preferRow = new EntryRow(_('Show Preferred Only'), settings, 'quick-settings-media-prefer');
        let preferSwitch = new Gtk.Switch({
            active: settings.get_boolean('quick-settings-media-prefer-one'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind( 'quick-settings-media-prefer-one',
            preferSwitch, 'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        preferRow.add_suffix(preferSwitch);
        mediaExpander.add_row(preferRow);
        mediaExpander.add_row(new DropDownRow(_('Style'), settings, 'quick-settings-media-style', [_('Normal'), _('Linear'), _('Full')]));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Roundness'), settings, 'quick-settings-media-cover-roundness', 0, 42, 1));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Width'), settings, 'quick-settings-media-cover-width', 40, 500, 5));
        mediaExpander.add_row(new SpinButtonRow(_('Cover Height'), settings, 'quick-settings-media-cover-height', 40, 300, 5));
            let titleExpander = new ExpanderRow(_('Show Title'), settings, 'quick-settings-media-show-text');
            titleExpander.add_row(new DropDownRow(_('Title Align'), settings, 'quick-settings-media-text-align', [_('Left'), _('Center'), _('Right')]));
            titleExpander.add_row(new DropDownRow(_('Title Position'), settings, 'quick-settings-media-text-position', [_('Top'), _('Bottom')]));
        mediaExpander.add_row(titleExpander);
        mediaExpander.add_row(new SwitchRow(_('Show Volume Slider'), settings, 'quick-settings-media-show-volume', MEDIA_SUBTITLE));
        mediaExpander.add_row(new SwitchRow(_('Show Loop and Shuffle'), settings, 'quick-settings-media-show-loop-shuffle', MEDIA_SUBTITLE));
        group.add(mediaExpander);
    }
});