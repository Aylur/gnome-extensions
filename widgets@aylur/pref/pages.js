'use strict';

const { Adw, Gio, Gtk, GObject, GLib } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const ByteArray = imports.byteArray;
const { SpinButtonRow, EntryRow, DropDownRow,
        SwitchRow, ColorRow, ExpanderRow,
        PositionRow, FileChooserButton, HotkeyDialog } = Me.imports.pref.widgets;

const { wsNamesGroup } = Me.imports.pref.workspaces; 

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
            tooltip_text: "Back",
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
        super._init('Battery Bar', settings);

        const group = new Adw.PreferencesGroup({ title: 'Battery Bar' });
        this.add(group);

        group.add(new PositionRow('Position', settings, 'battery-bar-position', 'battery-bar-offset'));

        let iconExpanderRow = new ExpanderRow('Show Icon', settings, 'battery-bar-show-icon');
        iconExpanderRow.add_row(new DropDownRow('Icon Position', settings, 'battery-bar-icon-position', ['Left', 'Right']));

        let labelExpanderRow = new ExpanderRow('Show Percentage', settings, 'battery-bar-show-percentage');
        labelExpanderRow.add_row(new ColorRow('Font Color Front', settings, 'battery-bar-font-color'));
        labelExpanderRow.add_row(new ColorRow('Font Color Background', settings, 'battery-bar-font-bg-color'));

        group.add(iconExpanderRow);
        group.add(labelExpanderRow);
        group.add(new SpinButtonRow('Width', settings, 'battery-bar-width', 50, 800, 10));
        group.add(new SpinButtonRow('Height', settings, 'battery-bar-height', 1, 100, 1));
        group.add(new SpinButtonRow('Bar Roundness', settings, 'battery-bar-roundness', 1, 100, 1));
        group.add(new SpinButtonRow('Low Threshold', settings, 'battery-bar-low-threshold', 0, 100, 5));

        let colorExpander = new Adw.ExpanderRow({ title: 'Bar Colors'});
        colorExpander.add_row(new ColorRow('Color', settings, 'battery-bar-color'));
        colorExpander.add_row(new ColorRow('Charging Color', settings, 'battery-bar-charging-color'));
        colorExpander.add_row(new ColorRow('Low Color', settings, 'battery-bar-low-color'));
        colorExpander.add_row(new ColorRow('Background Color', settings, 'battery-bar-bg-color'));
        group.add(colorExpander);
    }
});

var DashBoardPage = GObject.registerClass(
class DashBoardPage extends SubPage{
    _init(settings){
        super._init('Dash Board', settings);
    
        const buttonGroup = new Adw.PreferencesGroup({ title: 'Panel Button' });
        this.add(buttonGroup);

        buttonGroup.add(new SwitchRow('Hide Activities Button', settings, 'dash-hide-activities'));
        let enableExpander = new ExpanderRow('Enable Panel Button', settings, 'dash-button-enable');
        enableExpander.add_row(new PositionRow('Position', settings, 'dash-button-position', 'dash-button-offset'));
        let showIcon = new SwitchRow('Show Icon', settings, 'dash-button-show-icon');
        showIcon.add_suffix(new FileChooserButton(settings, 'dash-button-icon-path'));
        enableExpander.add_row(showIcon);
        enableExpander.add_row(new EntryRow('Label', settings, 'dash-button-label'));
        buttonGroup.add(enableExpander);

        const dashGroup = new Adw.PreferencesGroup({ title: 'Dash' });
        this.add(dashGroup);

        let shortcutRow = new Adw.ActionRow({ title: 'Shortcut Hotkey' });
        let shortcutCell = new Gtk.ShortcutsShortcut({ valign: Gtk.Align.CENTER });
        shortcutCell.accelerator = settings.get_strv('dash-shortcut').toString();
        let hotkeyButton = new Gtk.Button({
            label: 'Set Hotkey',
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
        dashGroup.add(new DropDownRow('Layout', settings, 'dash-layout', ['1', '2', '3',], 'Send me your layout ideas and I will add it.'));

        let appBoxExpander = new Adw.ExpanderRow({ title: 'App Launcher'});
        appBoxExpander.add_row(new SpinButtonRow('Rows', settings, 'dash-apps-rows', 1, 5, 1));
        appBoxExpander.add_row(new SpinButtonRow('Columns', settings, 'dash-apps-cols', 1, 5, 1));
        appBoxExpander.add_row(new SpinButtonRow('Icon Size', settings, 'dash-app-icon-size', 16, 64, 2));
        dashGroup.add(appBoxExpander);

        let levelsExpander = new Adw.ExpanderRow({ title: 'System Levels' });
        levelsExpander.add_row(new SwitchRow('Battery', settings, 'dash-levels-show-battery'));
        levelsExpander.add_row(new SwitchRow('Storage', settings, 'dash-levels-show-storage'));
        levelsExpander.add_row(new SwitchRow('CPU', settings, 'dash-levels-show-cpu'));
        levelsExpander.add_row(new SwitchRow('RAM', settings, 'dash-levels-show-ram'));
        levelsExpander.add_row(new SwitchRow('Temperature', settings, 'dash-levels-show-temp'));
        dashGroup.add(levelsExpander);

        let mediaExpander = new Adw.ExpanderRow({ title: 'Media Player' });
        mediaExpander.add_row(new EntryRow('Prefer', settings, 'dash-media-prefer'));
        mediaExpander.add_row(new DropDownRow('Style', settings, 'dash-media-style', ['Normal', 'Label on Cover', 'Label on Cover +Vertical Controls', 'Full']));
        mediaExpander.add_row(new SpinButtonRow('Cover Width', settings, 'dash-media-cover-width', 100, 800, 5));
        mediaExpander.add_row(new SpinButtonRow('Cover Height', settings, 'dash-media-cover-height', 100, 800, 5));
        mediaExpander.add_row(new SpinButtonRow('Cover Roundness', settings, 'dash-media-cover-roundness', 0, 48, 1));
            let textExpander = new ExpanderRow('Show Title', settings, 'date-menu-media-show-text');
            textExpander.add_row(new DropDownRow('Title Align', settings, 'date-menu-media-text-align', ['Left','Center','Right']));
            textExpander.add_row(new DropDownRow('Title Position', settings, 'date-menu-media-text-position', ['Top','Bot'], "Doesn't work on every style"));
            mediaExpander.add_row(textExpander);
        mediaExpander.add_row(new SwitchRow('Show Volume Slider', settings, 'dash-media-show-volume'));
        mediaExpander.add_row(new SwitchRow('Show Loop and Shuffle Button', settings, 'dash-media-show-loop-shuffle'));
        dashGroup.add(mediaExpander);

        dashGroup.add(new Adw.ActionRow({
            title: 'Web Links',
            subtitle:`You can change the links through dconf editor.\nIf you want your own icon: find an svg and name it theNameYouGaveItInDconf-symbolic.svg.\nI haven't figured out GTK to have a nice setting for it yet, sorry.`
        }));
    }
});

var DateMenuTweakPage = GObject.registerClass(
class DateMenuTweakPage extends SubPage{
    _init(settings){
        super._init('Date Menu Tweaks', settings);

        const menuGroup = new Adw.PreferencesGroup({ title: 'Menu' });
        this.add(menuGroup);
        menuGroup.add(new SwitchRow('Mirrored', settings, 'date-menu-mirror'));
        menuGroup.add(new SwitchRow('Hide Notifications', settings, 'date-menu-hide-notifications'));
        menuGroup.add(new SwitchRow('Hide Stock Mpris', settings, 'date-menu-hide-stock-mpris', "Hides the media players in the notification list"));

        const customMenuGroup = new Adw.PreferencesGroup({ title: 'Custom Menu' });
        this.add(customMenuGroup);

        let expander = new ExpanderRow('Enable Custom Menu', settings, 'date-menu-custom-menu');
        expander.add_row(new SwitchRow('Show User Icon', settings, 'date-menu-show-user'));
        expander.add_row(new SwitchRow('Show Events', settings, 'date-menu-show-events'));
        expander.add_row(new SwitchRow('Show Clocks', settings, 'date-menu-show-clocks'));
        expander.add_row(new SwitchRow('Show Weather', settings, 'date-menu-show-weather'));

        let levelsExpander = new ExpanderRow('Show System Levels', settings, 'date-menu-show-system-levels')
        levelsExpander.add_row(new SwitchRow('Battery', settings, 'date-menu-levels-show-battery'));
        levelsExpander.add_row(new SwitchRow('Storage', settings, 'date-menu-levels-show-storage'));
        levelsExpander.add_row(new SwitchRow('CPU', settings, 'date-menu-levels-show-cpu'));
        levelsExpander.add_row(new SwitchRow('RAM', settings, 'date-menu-levels-show-ram'));
        levelsExpander.add_row(new SwitchRow('Temperature', settings, 'date-menu-levels-show-temp'));
        expander.add_row(levelsExpander);

        let mediaExpander = new ExpanderRow('Show Media Player', settings, 'date-menu-show-media');
        mediaExpander.add_row(new EntryRow('Prefer', settings, 'date-menu-media-prefer'));
        mediaExpander.add_row(new DropDownRow('Style', settings, 'date-menu-media-style', ['Normal', 'Label on Cover', 'Label on Cover +Vertical Controls', 'Full']));
        mediaExpander.add_row(new SpinButtonRow('Cover Width', settings, 'date-menu-media-cover-width', 100, 500, 5));
        mediaExpander.add_row(new SpinButtonRow('Cover Height', settings, 'date-menu-media-cover-height', 100, 500, 5));
        mediaExpander.add_row(new SpinButtonRow('Cover Roundness', settings, 'date-menu-media-cover-roundness', 0, 48, 1));
            let textExpander = new ExpanderRow('Show Title', settings, 'date-menu-media-show-text');
            textExpander.add_row(new DropDownRow('Title Align', settings, 'date-menu-media-text-align', ['Left','Center','Right']));
            textExpander.add_row(new DropDownRow('Title Position', settings, 'date-menu-media-text-position', ['Top','Bot'], "Doesn't work on every style"));
            mediaExpander.add_row(textExpander);
        mediaExpander.add_row(new SwitchRow('Show Volume Slider', settings, 'date-menu-media-show-volume', "Doesn't work on every media player"));
        mediaExpander.add_row(new SwitchRow('Show Loop and Shuffle Button', settings, 'date-menu-media-show-loop-shuffle'));
        expander.add_row(mediaExpander);

        customMenuGroup.add(expander);

        const buttonGroup = new Adw.PreferencesGroup({ title: 'Clock Button' });
        this.add(buttonGroup);
        buttonGroup.add(new PositionRow('Position', settings, 'date-menu-position', 'date-menu-offset'));
        buttonGroup.add(new SwitchRow('Remove Padding', settings, 'date-menu-remove-padding'));
        buttonGroup.add(new DropDownRow('Indicator Position', settings, 'date-menu-indicator-position', ['Left', 'Right', 'Hide']));
        buttonGroup.add(new EntryRow('Format', settings, 'date-menu-date-format'));
        let textBox = new Gtk.Box();
        textBox.append(new Gtk.Label({
            xalign: 0,
            label:`
            %M - minutes 00-59
            %H - hour 00-23
            %I - hour 01-12
            %k - hour 0-23
            %l - hour 1-12
            %p - AM PM
            %P - am pm

            %C - century 00-99
            %j - day of year 001-366`
        }));
        textBox.append(new Gtk.Label({
            xalign: 0,
            label:`
            %a - weekday abr
            %A - weekday name
            %b - monthname abr
            %B - monthname name
            %Y - year 2000
            %d - day 01-31
            %e - day 1-31
            %m - month 01-12`
        }));
        buttonGroup.add(textBox);
    }
});

var MediaPlayerPage = GObject.registerClass(
class MediaPlayerPage extends SubPage{
    _init(settings){
        super._init('Media Player', settings);

        const buttonGroup = new Adw.PreferencesGroup({ title: 'Panel Button'});
        this.add(buttonGroup);

        let trackBtnExpander = new ExpanderRow('Track Button', settings, 'media-player-enable-track');
        trackBtnExpander.add_row(new PositionRow('Position', settings, 'media-player-position', 'media-player-offset'));
        trackBtnExpander.add_row(new SpinButtonRow('Max Width', settings, 'media-player-max-width', 0, 1200, 10, '0 to unset'));
        let controlsExpander = new ExpanderRow('Controls', settings, 'media-player-enable-controls');
        controlsExpander.add_row(new PositionRow('Position', settings, 'media-player-controls-position', 'media-player-controls-offset'));
        buttonGroup.add(trackBtnExpander);
        buttonGroup.add(controlsExpander);

        const playerGroup = new Adw.PreferencesGroup({ title: 'Player' });
        this.add(playerGroup);

        this.cachePath = `${Me.dir.get_path()}/media/mpris-cache`;
        this.clearRow = new Adw.ActionRow({ title: 'Cache' });
        let clearBtn = Gtk.Button.new_with_label('Clear');
        clearBtn.valign = Gtk.Align.CENTER;
        clearBtn.connect('clicked', () => this._clearCache());
        this.clearRow.add_suffix(clearBtn);
        playerGroup.add(this.clearRow);
        this._cacheSize();
        
        playerGroup.add(new EntryRow('Prefer', settings, 'media-player-prefer', 'It is the players d-bus name. e.g: Amberol, firefox, spotify.'));
        playerGroup.add(new DropDownRow('Style', settings, 'media-player-style', ['Normal', 'Horizontal', 'Compact', 'Label on Cover', 'Label on Cover +Vertical Controls', 'Full']));
        playerGroup.add(new SpinButtonRow('Cover Roundness', settings, 'media-player-cover-roundness', 1, 99, 1));
        playerGroup.add(new SpinButtonRow('Cover Width', settings, 'media-player-cover-width', 50, 500, 2));
        playerGroup.add(new SpinButtonRow('Cover Height', settings, 'media-player-cover-height', 50, 500, 2));
        let textExpander = new ExpanderRow('Show Title', settings, 'media-player-show-text');
        textExpander.add_row(new DropDownRow('Title Align', settings, 'media-player-text-align', ['Left','Center','Right']));
        textExpander.add_row(new DropDownRow('Title Position', settings, 'media-player-text-position', ['Top','Bot'], "Doesn't work on every style"));
        playerGroup.add(textExpander);
        playerGroup.add(new SwitchRow('Show Volume Slider', settings, 'media-player-show-volume', "Doesn't work on every media player"));
        playerGroup.add(new SwitchRow('Show Loop and Shuffle Button', settings, 'media-player-show-loop-shuffle'));
    }

    _cacheSize(){
        let [ok, out, err, exit] = GLib.spawn_command_line_sync(`du -h ${this.cachePath}`);
        let line = '';
        if(ok) line = ByteArray.toString(out).split(/\s+/)[0];
        if(line == '0') line = 'Empty';
        this.clearRow.set_subtitle(line);
    }

    _clearCache(){
        GLib.spawn_command_line_sync(`rm -r ${this.cachePath}`);
        this.clearRow.set_subtitle('Cleared!');
    }
});

var PowerMenuPage = GObject.registerClass(
class PowerMenuPage extends SubPage{
    _init(settings){
        super._init('Power Menu', settings);

        const group = new Adw.PreferencesGroup({ title: 'Power Menu' });
        this.add(group);

        group.add(new PositionRow('Position', settings, 'power-menu-position', 'power-menu-offset'));
        group.add(new DropDownRow('Layout', settings, 'power-menu-layout', ["2x2", "1x4"]));
        group.add(new DropDownRow('Label Position', settings, 'power-menu-label-position', ['Inside', 'Outside', 'Hidden']));
        group.add(new SpinButtonRow('Button Roundness', settings, 'power-menu-button-roundness', 0, 99, 2));
        group.add(new SpinButtonRow('Icon Size', settings, 'power-menu-icon-size', 0, 300, 2));
        group.add(new SpinButtonRow('Icon Padding', settings, 'power-menu-icon-padding', 0, 150, 2));
        group.add(new SpinButtonRow('Spacing', settings, 'power-menu-dialog-spacing', 0, 150, 2));

        let dialogExpander = new ExpanderRow('Dialog Background', settings, 'power-menu-dialog-show-bg');
        dialogExpander.add_row(new SpinButtonRow('Dialog Padding', settings, 'power-menu-dialog-padding', 0, 150, 2));
        dialogExpander.add_row(new SpinButtonRow('Dialog Roundness', settings, 'power-menu-dialog-roundness', 0, 100, 1));

        group.add(dialogExpander);
    }
});

var WorkspaceIndicatorPage = GObject.registerClass(
class WorkspaceIndicatorPage extends SubPage{
    _init(settings){
        super._init('Workspace Indicator', settings);

        const group = new Adw.PreferencesGroup({ title: 'Panel Widget' });
        this.add(group);

        group.add(new PositionRow('Position', settings, 'workspace-indicator-position', 'workspace-indicator-offset'));
        group.add(new SwitchRow('Show Names', settings, 'workspace-indicator-show-names'));

        this.add(new wsNamesGroup());
    }
});

var NotificationIndicatorPage = GObject.registerClass(
class NotificationIndicatorPage extends SubPage{
    _init(settings){
        super._init('Notification Indicator', settings);

        const group = new Adw.PreferencesGroup({ title: 'Notification Indicator' });
        this.add(group);

        group.add(new DropDownRow('Position', settings, 'notification-indicator-position', ["Left", "Center", "Right", "Setting Indicators"]));
        group.add(new SpinButtonRow('Offset', settings, 'notification-indicator-offset', 0, 16, 1));
        group.add(new SwitchRow('Hide on Zero', settings, 'notification-indicator-hide-on-zero'));
        group.add(new SpinButtonRow('Menu Width', settings, 'notification-indicator-menu-width', 100, 1000, 10));
        group.add(new SwitchRow('Hide Counter', settings, 'notification-indicator-hide-counter'));
        group.add(new SwitchRow('Show Do Nut Disturb', settings, 'notification-indicator-show-dnd'));
    }
});
    
var BackgroundClockPage = GObject.registerClass(
class BackgroundClockPage extends SubPage{
    _init(settings){
        super._init('Background Clock', settings);

        const group = new Adw.PreferencesGroup({ title: 'Background Clock' });
        this.add(group);
        
        group.add(new DropDownRow('Position', settings, 'background-clock-position',
        ['Top Left', 'Top Center', 'Top Right',
        'Middle Left', 'Middle Center', 'Middle Right',
        'Bottom Left', 'Bottom Center', 'Bottom Right']));

        group.add(new SpinButtonRow('X Offset', settings, 'background-clock-x-offset', 0, 500, 5));
        group.add(new SpinButtonRow('Y Offset', settings, 'background-clock-y-offset', 0, 500, 5));

        let clockExpander = new ExpanderRow('Clock', settings, 'background-clock-enable-clock');
        clockExpander.add_row(new EntryRow('Clock Format', settings, 'background-clock-clock-format'));
        clockExpander.add_row(new SpinButtonRow('Clock Size', settings, 'background-clock-clock-size', 1, 200, 2));
        clockExpander.add_row(this._addCustomFontRow(settings, 'background-clock-clock-custom-font', 'background-clock-clock-font'));
        clockExpander.add_row(new ColorRow('Clock Color', settings, 'background-clock-clock-color'));
        clockExpander.add_row(new SpinButtonRow('Text Shadow x Offset', settings, 'background-clock-clock-shadow-x', 0, 50, 1));
        clockExpander.add_row(new SpinButtonRow('Text Shadow y Offset', settings, 'background-clock-clock-shadow-y', 0, 50, 1));
        clockExpander.add_row(new SpinButtonRow('Text Shadow Blur Amount', settings, 'background-clock-clock-shadow-blur', 0, 50, 1));
        clockExpander.add_row(new SpinButtonRow('Text Shadow Width', settings, 'background-clock-clock-shadow-width', 0, 50, 1));
        clockExpander.add_row(new ColorRow('Text Shadow Color', settings, 'background-clock-clock-shadow-color'));

        let dateExpander = new ExpanderRow('Date', settings, 'background-clock-enable-date');
        dateExpander.add_row(new EntryRow('Date Format', settings, 'background-clock-date-format'));
        dateExpander.add_row(new SpinButtonRow('Date Size', settings, 'background-clock-date-size', 1, 200, 2));
        dateExpander.add_row(this._addCustomFontRow(settings, 'background-clock-date-custom-font', 'background-clock-date-font'));
        dateExpander.add_row(new ColorRow('Date Color', settings, 'background-clock-date-color'));
        dateExpander.add_row(new SpinButtonRow('Text Shadow x Offset', settings, 'background-clock-date-shadow-x', 0, 50, 1));
        dateExpander.add_row(new SpinButtonRow('Text Shadow y Offset', settings, 'background-clock-date-shadow-y', 0, 50, 1));
        dateExpander.add_row(new SpinButtonRow('Text Shadow Blur Amount', settings, 'background-clock-date-shadow-blur', 0, 50, 1));
        dateExpander.add_row(new SpinButtonRow('Text Shadow Width', settings, 'background-clock-date-shadow-width', 0, 50, 1));
        dateExpander.add_row(new ColorRow('Text Shadow Color', settings, 'background-clock-date-shadow-color'));

        let styleExpander = new Adw.ExpanderRow({ title: 'Widget Style' });
        styleExpander.add_row(new ColorRow('Background Color', settings, 'background-clock-bg-color'));
        styleExpander.add_row(new SpinButtonRow('Padding', settings, 'background-clock-bg-padding', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow('Border Size', settings, 'background-clock-bg-border-size', 0, 100, 1));
        styleExpander.add_row(new ColorRow('Border Color', settings, 'background-clock-bg-border-color'));
        styleExpander.add_row(new SpinButtonRow('Roundness', settings, 'background-clock-bg-border-radius', 0, 100, 1));
        styleExpander.add_row(new SwitchRow('Shadow Inset', settings, 'background-clock-bg-shadow-inset'));
        styleExpander.add_row(new SpinButtonRow('Shadow x Offset', settings, 'background-clock-bg-shadow-x', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow('Shadow y Offset', settings, 'background-clock-bg-shadow-y', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow('Shadow Blur Amount', settings, 'background-clock-bg-shadow-blur', 0, 100, 1));
        styleExpander.add_row(new SpinButtonRow('Shadow Width', settings, 'background-clock-bg-shadow-width', 0, 100, 1));
        styleExpander.add_row(new ColorRow('Shadow Color', settings, 'background-clock-bg-shadow-color'));

        group.add(clockExpander);
        group.add(dateExpander);
        group.add(styleExpander);

        let textBox = new Gtk.Box();
        textBox.append(new Gtk.Label({
            xalign: 0,
            label:`
            Date Formats:

            %M - minutes 00-59
            %H - hour 00-23
            %I - hour 01-12
            %k - hour 0-23
            %l - hour 1-12
            %p - AM PM
            %P - am pm

            %C - century 00-99
            %j - day of year 001-366`
        }));
        textBox.append(new Gtk.Label({
            xalign: 0,
            label:`
            %a - weekday abr
            %A - weekday name
            %b - monthname abr
            %B - monthname name
            %Y - year 2000
            %d - day 01-31
            %e - day 1-31
            %m - month 01-12`
        }));

        group.add(textBox);
   }

   _addCustomFontRow(settings, switchName, settingName){
        let row = new SwitchRow('Custom Font', settings, switchName);
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

var QuickTogglesPage = GObject.registerClass(
class QuickTogglesPage extends SubPage{
    _init(settings){
        super._init('Quick Toggles', settings);

        const group = new Adw.PreferencesGroup({ title: 'Quick Toggles' });
        this.add(group);

        group.add(new DropDownRow('Style', settings, 'quick-settings-style', ["Normal", "Separated", "Compact"]));
        group.add(new SwitchRow('Hide Notifications', settings, 'quick-settings-hide-notifications'));
        group.add(new SwitchRow('Hide System Levels', settings, 'quick-settings-hide-system-levels'));
        group.add(new SwitchRow('Hide Media', settings, 'quick-settings-hide-media'));
    }
});