'use strict';

const { Adw, Gio, Gtk, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { wsNamesGroup } = Me.imports.prefsWS; 

function init() {}

const SpinButton = GObject.registerClass(
class SpinButton extends Adw.ActionRow{
    _init(title, settings, settingName, low, high, step){
        super._init({ title: title });
    
        const gspin = Gtk.SpinButton.new_with_range(low, high, step);
        gspin.valign = Gtk.Align.CENTER;
        settings.bind(
            settingName,
            gspin,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(gspin);
        this.activatable_widget = gspin;
    }
});

const Entry = GObject.registerClass(
class Entry extends Adw.ActionRow{
    _init(title, settings, settingName){
        super._init({ title: title });
    
        const gentry = new Gtk.Entry({ valign: Gtk.Align.CENTER, });
        gentry.connect('activate',
            () => settings.set_string(settingName, gentry.buffer.text));
        settings.bind(
            settingName,
            gentry.buffer,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(gentry);
        this.activatable_widget = gentry;
    }
});

const DropDown = GObject.registerClass(
class DropDown extends Adw.ActionRow{
    _init(title, settings, settingName, list){
        super._init({ title: title });
    
        const glist = Gtk.DropDown.new_from_strings(list);
        glist.valign = Gtk.Align.CENTER;
        settings.bind(
            settingName,
            glist,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(glist);
        this.activatable_widget = glist;
    }
});

const Switch = GObject.registerClass(
class Switch extends Adw.ActionRow{
    _init(title, settings, settingName){
        super._init({ title: title });

        const gswitch = new Gtk.Switch({
            active: settings.get_boolean(settingName),
            valign: Gtk.Align.CENTER,
        });
        settings.bind(
            settingName,
            gswitch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(gswitch);
        this.activatable_widget = gswitch;
    }
});

const BatteryBarPage = GObject.registerClass(
class BatteryBarPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Battery Bar',
            icon_name: 'battery-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Battery Bar', settings, 'battery-bar'));
        this.add(toggleGroup);

        const group = new Adw.PreferencesGroup();
        this.add(group);

        group.add(new DropDown('Position', settings, 'battery-bar-position', ["Left", "Center", "Right"]));
        group.add(new SpinButton('Offset', settings, 'battery-bar-offset', 0, 12, 1));
        group.add(new Switch('Show Icon', settings, 'battery-bar-show-icon'));
        group.add(new Switch('Show Percentage', settings, 'battery-bar-show-percentage'));
        group.add(new SpinButton('Width', settings, 'battery-bar-width', 50, 800, 10));

    }
});

const DashBoardPage = GObject.registerClass(
class DashBoardPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Dash Board',
            icon_name: 'org.gnome.Settings-applications-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Dash Board', settings, 'dash-board'));
        this.add(toggleGroup);

        const buttonGroup = new Adw.PreferencesGroup({ title: 'Panel Button' });
        this.add(buttonGroup);

        buttonGroup.add(new Switch('Replace Activities Button', settings, 'dash-replace-activities-button'));
        buttonGroup.add(new Switch('Hide', settings, 'dash-button-hide'));
        buttonGroup.add(new Entry('Label', settings, 'dash-button-label'));
        buttonGroup.add(new Switch('Hide Icon', settings, 'dash-button-icon-hide'));
        buttonGroup.add(new Entry('Icon Path', settings, 'dash-button-icon-path'));
        buttonGroup.add(new DropDown('Position', settings, 'dash-button-position', ["Left", "Center", "Right"]));
        buttonGroup.add(new SpinButton('Offset', settings, 'dash-button-offset', 0, 12, 1));

        const dashGroup = new Adw.PreferencesGroup({ title: 'Dash' });
        this.add(dashGroup);

        dashGroup.add(new SpinButton('Layout', settings, 'dash-layout', 1, 3, 1));
        dashGroup.add(new SpinButton('App Launcher Rows', settings, 'dash-apps-rows', 1, 5, 1));
        dashGroup.add(new SpinButton('App Launcher Columns', settings, 'dash-apps-cols', 1, 5, 1));
        dashGroup.add(new SpinButton('App Launcher Size', settings, 'dash-app-icon-size', 16, 64, 2));
        dashGroup.add(new Adw.ActionRow({
            title: 'Other Settings',
            subtitle:`Dash Boards shortcut is Super+d by default, however, you can change it through dconf.\nYou can change the links aswell through dconf editor.\nIf you want your own icon: find an svg and name it theNameYouGaveItInDconf-symbolic.svg.\nI haven't figured out GTK to have a nice setting for it yet, sorry.`
        }));
    }
});

const DateMenuModPage = GObject.registerClass(
class DateMenuModPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'DateMenu Mod',
            icon_name: 'org.gnome.clocks-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Date Menu Mod', settings, 'date-menu-mod'));
        this.add(toggleGroup);

        const group = new Adw.PreferencesGroup();
        this.add(group);
        group.add(new DropDown('Position', settings, 'date-menu-position', ['Left', 'Center', 'Right']));
        group.add(new SpinButton('Offset', settings, 'date-menu-offset', 0, 12, 1));
        group.add(new Switch('Remove Padding', settings, 'date-menu-remove-padding'));
        group.add(new DropDown('Indicator Position', settings, 'date-menu-indicator-position', ['Left', 'Right', 'Hide']));
        group.add(new Entry('Date Format', settings, 'date-menu-date-format'));
        group.add(new Switch('Mirrored', settings, 'date-menu-mirror'));
        group.add(new Switch('Hide Notifications', settings, 'date-menu-hide-notifications'));

        const customMenuGroup = new Adw.PreferencesGroup({ title: 'Custom Menu' });
        this.add(customMenuGroup);
        customMenuGroup.add(new Switch('Enable Custom Menu', settings, 'date-menu-custom-menu'));
        customMenuGroup.add(new Switch('Hide User Icon', settings, 'date-menu-hide-user'));
        customMenuGroup.add(new Switch('Hide Events', settings, 'date-menu-hide-events'));
        customMenuGroup.add(new Switch('Hide Clocks', settings, 'date-menu-hide-clocks'));
        customMenuGroup.add(new Switch('Hide Weather', settings, 'date-menu-hide-weather'));
        customMenuGroup.add(new Switch('Hide Media Player', settings, 'date-menu-hide-media'));
        customMenuGroup.add(new Switch('Hide System Levels', settings, 'date-menu-hide-system-levels'));
    }
});

const MediaPlayerPage = GObject.registerClass(
class MediaPlayerPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Media Player',
            icon_name: 'applications-multimedia-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Media Player', settings, 'media-player'));
        this.add(toggleGroup);

        const trackGroup = new Adw.PreferencesGroup({ title: 'Track Button' });
        const controlsGroup = new Adw.PreferencesGroup({ title: 'Controls' });
        const playerGroup = new Adw.PreferencesGroup({ title: 'Player' });
        
        this.add(trackGroup);
        this.add(controlsGroup);
        this.add(playerGroup);

        trackGroup.add(new Switch('Hide', settings, 'media-player-hide-track'));
        trackGroup.add(new DropDown('Position', settings, 'media-player-position', ["Left", "Center", "Right"]));
        trackGroup.add(new SpinButton('Offset', settings, 'media-player-offset', 0, 12, 1));
        trackGroup.add(new SpinButton('Max Width', settings, 'media-player-max-width', 0, 800, 10));

        controlsGroup.add(new Switch('Hide', settings, 'media-player-hide-controls'));
        controlsGroup.add(new DropDown('Position', settings, 'media-player-controls-position', ["Left", "Center", "Right"]));
        controlsGroup.add(new SpinButton('Offset', settings, 'media-player-controls-offset', 0, 12, 1));
        
        let preferEntry = new Entry('Prefer', settings, 'media-player-prefer');
        preferEntry.subtitle = 'It is the players d-bus name, though the full name is not needed, but capitals matter(? im not sure), examples: Amberol, firefox, spotify, Spot.\nThis setting is also for dash board and date menu.'
        playerGroup.add(preferEntry);
        playerGroup.add(new DropDown('Layout', settings, 'media-player-layout', ["Normal", "Compact"]));
    }
});

const PowerMenuPage = GObject.registerClass(
class PowerMenuPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Power Menu',
            icon_name: 'system-shutdown-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Power Menu', settings, 'power-menu'));
        this.add(toggleGroup);

        const group = new Adw.PreferencesGroup();
        this.add(group);

        group.add(new DropDown('Position', settings, 'power-menu-position', ["Right", "Left"]));
        group.add(new DropDown('Layout', settings, 'power-menu-layout', ["2x2", "1x4"]));
        group.add(new DropDown('Style', settings, 'power-menu-style', ["Round", "Rectangle"]));
    }
});

const WorkspaceIndicatorPage = GObject.registerClass(
class WorkspaceIndicatorPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Workspace Indicator',
            icon_name: 'org.gnome.Settings-multitasking-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Workspace Indicator', settings, 'workspace-indicator'));
        this.add(toggleGroup);

        const group = new Adw.PreferencesGroup();
        this.add(group);

        group.add(new DropDown('Position', settings, 'workspace-indicator-position', ["Left", "Center", "Right"]));
        group.add(new SpinButton('Offset', settings, 'workspace-indicator-offset', 0, 12, 1));
        group.add(new Switch('Show Names', settings, 'workspace-indicator-show-names'));

        this.add(new wsNamesGroup());
    }
});

const QuickTogglesPage = GObject.registerClass(
class QuickTogglesPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Quick Toggles',
            icon_name: 'open-menu-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Quick Toggles', settings, 'quick-toggles'));
        this.add(toggleGroup);

        const group = new Adw.PreferencesGroup();
        this.add(group);

        group.add(new DropDown('Stlye', settings, 'quick-toggles-style', ["Normal", "Separated", "Compact"]));
        group.add(new Switch('Hide Notifications', settings, 'quick-toggles-hide-notifications'));
        group.add(new Switch('Hide System Levels', settings, 'quick-toggles-hide-system-levels'));
        group.add(new Switch('Hide Media', settings, 'quick-toggles-hide-media'));
    }
});

const NotificationIndicatorPage = GObject.registerClass(
class NotificationIndicatorPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Notification Indicator',
            icon_name: 'org.gnome.Settings-notifications-symbolic'
        });

        const toggleGroup = new Adw.PreferencesGroup();
        toggleGroup.add(new Switch('Notification Indicator', settings, 'notification-indicator'));
        this.add(toggleGroup);

        const group = new Adw.PreferencesGroup();
        this.add(group);

        group.add(new DropDown('Position', settings, 'notification-indicator-position', ["Left", "Center", "Right", "QuickSettings"]));
        group.add(new SpinButton('Offset', settings, 'notification-indicator-offset', 0, 12, 1));
        group.add(new Switch('Hide on Zero', settings, 'notification-indicator-hide-on-zero'));
        group.add(new SpinButton('Menu Width', settings, 'notification-indicator-menu-width', 100, 1000, 10));
        group.add(new Switch('Hide Counter', settings, 'notification-indicator-hide-counter'));
    }
});

const BackgroundClockPage = GObject.registerClass(
class BackgroundClockPage extends Adw.PreferencesPage{
    _init(settings){
        super._init({
            title: 'Background Clock',
            icon_name: 'org.gnome.clocks-symbolic'
        });

        const group = new Adw.PreferencesGroup();
        this.add(group);
        
        group.add(new DropDown('Position', settings, 'background-clock-position',
        ['Top Left', 'Top Center', 'Top Right',
        'Middle Left', 'Middle Center', 'Middle Right',
        'Bottom Left', 'Bottom Center', 'Bottom Right']));

        group.add(new SpinButton('Offset', settings, 'background-clock-offset', 0, 500, 5));
        group.add(new SpinButton('Clock Size', settings, 'background-clock-clock-size', 1, 200, 2));
        group.add(new SpinButton('Date Size', settings, 'background-clock-date-size', 1, 200, 2));

        group.add(new Entry('Clock Format', settings, 'background-clock-clock-format'));
        group.add(new Entry('Date Format', settings, 'background-clock-date-format'));
        group.add(new Entry('Color', settings, 'background-clock-color'));

        let cssRow = new Entry('Other CSS', settings, 'background-clock-other-css');
        cssRow.subtitle = "Text Shadow might be glitchy sometimes";
        group.add(cssRow);

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
});

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();
    window.add(new BatteryBarPage(settings));
    window.add(new DashBoardPage(settings));
    window.add(new DateMenuModPage(settings));
    window.add(new MediaPlayerPage(settings));
    window.add(new PowerMenuPage(settings));
    window.add(new WorkspaceIndicatorPage(settings));
    window.add(new QuickTogglesPage(settings));
    window.add(new NotificationIndicatorPage(settings));
    window.add(new BackgroundClockPage(settings));
    window.search_enabled = true;    
}