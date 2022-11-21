'use strict';

const { Adw, Gio, Gtk, GObject, Gdk, GdkPixbuf } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const GnomeVersion = Math.floor(imports.misc.config.PACKAGE_VERSION);

const { wsNamesGroup } = Me.imports.prefsWS; 

function init() {}

const SpinButtonRow = GObject.registerClass(
class SpinButtonRow extends Adw.ActionRow{
    _init(title, settings, settingName, low, high, step, subtitle = ''){
        super._init({ title: title, subtitle: subtitle });
    
        let gspin = Gtk.SpinButton.new_with_range(low, high, step);
        gspin.valign = Gtk.Align.CENTER;
        settings.bind( settingName,
            gspin, 'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(gspin);
        this.activatable_widget = gspin;
    }
});

const EntryRow = GObject.registerClass(
class EntryRow extends Adw.ActionRow{
    _init(title, settings, settingName, subtitle = ''){
        super._init({ title: title, subtitle: subtitle });
    
        let gentry = new Gtk.Entry({ valign: Gtk.Align.CENTER, });
        gentry.connect('activate',
            () => settings.set_string(settingName, gentry.buffer.text));
        settings.bind( settingName,
            gentry.buffer, 'text',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(gentry);
        this.activatable_widget = gentry;
    }
});

const DropDownRow = GObject.registerClass(
class DropDownRow extends Adw.ActionRow{
    _init(title, settings, settingName, list, subtitle = ''){
        super._init({ title: title, subtitle: subtitle });
    
        let glist = Gtk.DropDown.new_from_strings(list);
        glist.valign = Gtk.Align.CENTER;
        settings.bind( settingName,
            glist, 'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(glist);
        this.activatable_widget = glist;
    }
});

const SwitchRow = GObject.registerClass(
class SwitchRow extends Adw.ActionRow{
    _init(title, settings, settingName, subtitle = ''){
        super._init({ title: title, subtitle: subtitle });

        this.switch = new Gtk.Switch({
            active: settings.get_boolean(settingName),
            valign: Gtk.Align.CENTER,
        });
        settings.bind( settingName,
            this.switch, 'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(this.switch);
        this.activatable_widget = this.switch;
    }
});

const ColorRow = GObject.registerClass(
class ColorRow extends Adw.ActionRow{
    _init(title, settings, settingName, subtitle = ''){
        super._init({ title: title, subtitle: subtitle });

        let rgba = new Gdk.RGBA();
        rgba.parse(settings.get_string(settingName));
        let colorButton = new Gtk.ColorButton({
            rgba,
            use_alpha: true,
            valign: Gtk.Align.CENTER
        });
        colorButton.connect('color-set', () => 
            settings.set_string(settingName,
                colorButton.get_rgba().to_string())
        );
        this.add_suffix(colorButton);
        this.activatable_widget = colorButton;
    }
});

const ExpanderRow = GObject.registerClass(
class ExpanderRow extends Adw.ExpanderRow{
    _init(title, settings, settingName, subtitle = ''){
        super._init({
            title: title,
            subtitle: subtitle,
            show_enable_switch: true
        });

        this.enable_expansion = settings.get_boolean(settingName);
        this.connect("notify::enable-expansion", () => {
            settings.set_boolean(settingName, this.enable_expansion);
        });
    }
});

const PositionRow = GObject.registerClass(
class PositionRow extends Adw.ActionRow{
    _init(title, settings, position, offset, subtitle = ''){
        super._init({ title: title, subtitle: subtitle });
    
        let glist = Gtk.DropDown.new_from_strings(['Left', 'Center', 'Right']);
        glist.valign = Gtk.Align.CENTER;
        settings.bind(
            position,
            glist,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(glist);

        let gspin = Gtk.SpinButton.new_with_range(0, 12, 1);
        gspin.valign = Gtk.Align.CENTER;
        settings.bind(
            offset,
            gspin,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        this.add_suffix(gspin);
    }

});

const FileChooserButton = GObject.registerClass(
class FileChooserButton extends Gtk.Button{
    _init(settings, settingName){
        super._init({
            icon_name: 'folder-open-symbolic',
            valign: Gtk.Align.CENTER
        })

        this.settings = settings;
        this.settingName = settingName;

        this.connect('clicked', this._onClick.bind(this));
    }

    _onClick(){
        this.dialog = new Gtk.FileChooserDialog({ title: 'Select File' });
        let window = this.get_root();
        this.dialog.set_transient_for(window)
        let header = this.dialog.get_header_bar();
        header.show_title_buttons = false;

        let selectBtn = new Gtk.Button({ label: 'Select' });
        let cancelBtn = new Gtk.Button({ label: 'Cancel' });
        selectBtn.get_style_context().add_class('suggested-action');

        selectBtn.connect('clicked', () => this._onSelect());
        cancelBtn.connect('clicked', () => this.dialog.close());

        header.pack_end(selectBtn);
        header.pack_start(cancelBtn);

        this.dialog.show();
    }

    _onSelect(){
        let path = this.dialog.get_file().file.get_path();
        this.settings.set_string(this.settingName, path);
        this.dialog.close();
    }
});

// https://gitlab.com/arcmenu/ArcMenu
const HotkeyDialog = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT] },
    },
},
class ArcMenu_HotkeyDialog extends Gtk.Window {
    _init(settings, parent) {
        this._settings = settings;
        this.keyEventController = new Gtk.EventControllerKey();

        super._init({
            modal: true,
            title: 'Set Custom Hotkey',
            transient_for: parent.get_root()
        });
        let vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            homogeneous: false,
            margin_top: 5,
            margin_bottom: 5,
            margin_start: 5,
            margin_end: 5,
            hexpand: true,
            halign: Gtk.Align.FILL
        });
        this.set_child(vbox);
        this._createLayout(vbox);
        this.add_controller(this.keyEventController);
        this.set_size_request(500, 250);
    }

    _createLayout(vbox) {
        let hotkeyKey = '';

        let modFrame = new Adw.PreferencesGroup()
        let modRow = new Adw.ActionRow({
            title: 'Choose Modifiers'
        });

        let buttonBox = new Gtk.Box({
            hexpand: true,
            halign: Gtk.Align.END,
            spacing: 5
        });
        modRow.add_suffix(buttonBox);
        let ctrlButton = new Gtk.ToggleButton({
            label: 'Ctrl',
            valign: Gtk.Align.CENTER
        });
        let superButton = new Gtk.ToggleButton({
            label: 'Super',
            valign: Gtk.Align.CENTER
        });
        let shiftButton = new Gtk.ToggleButton({
            label: 'Shift',
            valign: Gtk.Align.CENTER
        });
        let altButton = new Gtk.ToggleButton({
            label: 'Alt',
            valign: Gtk.Align.CENTER
        });
        ctrlButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        superButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        shiftButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        altButton.connect('toggled', () => {
            this.resultsText="";
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += hotkeyKey;
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });
        buttonBox.append(ctrlButton);
        buttonBox.append(superButton);
        buttonBox.append(shiftButton);
        buttonBox.append(altButton);
        modFrame.add(modRow);
        vbox.append(modFrame);

        let keyFrame = new Adw.PreferencesGroup();
        let keyLabel = new Gtk.Label({
            label: 'Press any key',
            use_markup: true,
            xalign: .5,
            hexpand: true,
            halign: Gtk.Align.CENTER
        });
        vbox.append(keyLabel);

        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/media/prefs/keyboard-symbolic.svg', 256, 72);
        let keyboardImage = Gtk.Picture.new_for_pixbuf(pixbuf);
        keyboardImage.hexpand = true;
        keyboardImage.vexpand = true;
        keyboardImage.halign = Gtk.Align.CENTER;
        keyboardImage.valign = Gtk.Align.CENTER;
        vbox.append(keyboardImage);

        let resultsRow = new Adw.ActionRow({
            title: 'New Hotkey'
        });
        let resultsWidget = new Gtk.ShortcutsShortcut({
            hexpand: true,
            halign: Gtk.Align.END
        });
        resultsRow.add_suffix(resultsWidget);
        keyFrame.add(resultsRow);

        let applyButton = new Gtk.Button({
            label: 'Apply',
            halign: Gtk.Align.END,
            css_classes: ['suggested-action']
        });
        applyButton.connect('clicked', () => {
            this.emit("response", Gtk.ResponseType.APPLY);
        });
        applyButton.set_sensitive(false);

        this.keyEventController.connect('key-released', (controller, keyval, keycode, state) =>  {
            this.resultsText = "";
            let key = keyval;
            hotkeyKey = Gtk.accelerator_name(key, 0);
            if(ctrlButton.get_active()) this.resultsText += "<Ctrl>";
            if(superButton.get_active()) this.resultsText += "<Super>";
            if(shiftButton.get_active()) this.resultsText += "<Shift>";
            if(altButton.get_active()) this.resultsText += "<Alt>";
            this.resultsText += Gtk.accelerator_name(key,0);
            resultsWidget.accelerator =  this.resultsText;
            applyButton.set_sensitive(true);
        });

        vbox.append(keyFrame);
        vbox.append(applyButton);
    }
});

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


const BatteryBarPage = GObject.registerClass(
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

const DashBoardPage = GObject.registerClass(
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
        dashGroup.add(new SpinButtonRow('Layout', settings, 'dash-layout', 1, 3, 1, 'Send me your layout idea and I will add it.'));
        dashGroup.add(new SpinButtonRow('App Launcher Rows', settings, 'dash-apps-rows', 1, 5, 1));
        dashGroup.add(new SpinButtonRow('App Launcher Columns', settings, 'dash-apps-cols', 1, 5, 1));
        dashGroup.add(new SpinButtonRow('App Launcher Size', settings, 'dash-app-icon-size', 16, 64, 2));
        dashGroup.add(new Adw.ActionRow({
            title: 'Web Links',
            subtitle:`You can change the links through dconf editor.\nIf you want your own icon: find an svg and name it theNameYouGaveItInDconf-symbolic.svg.\nI haven't figured out GTK to have a nice setting for it yet, sorry.`
        }));
    }
});

const DateMenuModPage = GObject.registerClass(
class DateMenuModPage extends SubPage{
    _init(settings){
        super._init('DateMenu Mod', settings);

        const group = new Adw.PreferencesGroup({ title: 'Date Button' });
        this.add(group);
        group.add(new PositionRow('Position', settings, 'date-menu-position', 'date-menu-offset'));
        group.add(new SwitchRow('Remove Padding', settings, 'date-menu-remove-padding'));
        group.add(new DropDownRow('Indicator Position', settings, 'date-menu-indicator-position', ['Left', 'Right', 'Hide']));
        group.add(new EntryRow('Date Format', settings, 'date-menu-date-format'));

        const menuGroup = new Adw.PreferencesGroup({ title: 'Menu' });
        this.add(menuGroup);
        menuGroup.add(new SwitchRow('Mirrored', settings, 'date-menu-mirror'));
        menuGroup.add(new SwitchRow('Hide Notifications', settings, 'date-menu-hide-notifications'));

        const customMenuGroup = new Adw.PreferencesGroup({ title: 'Custom Menu' });
        this.add(customMenuGroup);

        let expander = new ExpanderRow('Enable Custom Menu', settings, 'date-menu-custom-menu');
        expander.add_row(new SwitchRow('Hide User Icon', settings, 'date-menu-hide-user'));
        expander.add_row(new SwitchRow('Hide Events', settings, 'date-menu-hide-events'));
        expander.add_row(new SwitchRow('Hide Clocks', settings, 'date-menu-hide-clocks'));
        expander.add_row(new SwitchRow('Hide Weather', settings, 'date-menu-hide-weather'));
        expander.add_row(new SwitchRow('Hide Media Player', settings, 'date-menu-hide-media'));
        expander.add_row(new SwitchRow('Hide System Levels', settings, 'date-menu-hide-system-levels'));

        customMenuGroup.add(expander);
    }
});

const MediaPlayerPage = GObject.registerClass(
class MediaPlayerPage extends SubPage{
    _init(settings){
        super._init('Media Player', settings);

        const group = new Adw.PreferencesGroup({ title: 'Panel Button'});
        this.add(group);

        let trackBtnExpander = new ExpanderRow('Track Button', settings, 'media-player-enable-track');
        trackBtnExpander.add_row(new PositionRow('Position', settings, 'media-player-position', 'media-player-offset'));
        trackBtnExpander.add_row(new SpinButtonRow('Max Width', settings, 'media-player-max-width', 0, 1200, 10, '0 to unset'));
        let controlsExpander = new ExpanderRow('Controls', settings, 'media-player-enable-controls');
        controlsExpander.add_row(new PositionRow('Position', settings, 'media-player-controls-position', 'media-player-controls-offset'));
        group.add(trackBtnExpander);
        group.add(controlsExpander);

        const playerGroup = new Adw.PreferencesGroup({ title: 'Player' });
        this.add(playerGroup);
        playerGroup.add(new EntryRow('Prefer', settings, 'media-player-prefer', 'It is the players d-bus name, though the full name is not needed, but capitals matter(? im not sure), examples: Amberol, firefox, spotify, Spot.\nThis setting is also for dash board and date menu.'));
        playerGroup.add(new DropDownRow('Layout', settings, 'media-player-layout', ["Normal", "Compact"]));
    }
});

const PowerMenuPage = GObject.registerClass(
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

const WorkspaceIndicatorPage = GObject.registerClass(
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

const NotificationIndicatorPage = GObject.registerClass(
class NotificationIndicatorPage extends SubPage{
    _init(settings){
        super._init('Notification Indicator', settings);

        const group = new Adw.PreferencesGroup({ title: 'Notification Indicator' });
        this.add(group);

        group.add(new DropDownRow('Position', settings, 'notification-indicator-position', ["Left", "Center", "Right", "Aggregate Menu"]));
        group.add(new SpinButtonRow('Offset', settings, 'notification-indicator-offset', 0, 12, 1));
        group.add(new SwitchRow('Hide on Zero', settings, 'notification-indicator-hide-on-zero'));
        group.add(new SpinButtonRow('Menu Width', settings, 'notification-indicator-menu-width', 100, 1000, 10));
        group.add(new SwitchRow('Hide Counter', settings, 'notification-indicator-hide-counter'));
    }
});
    
const BackgroundClockPage = GObject.registerClass(
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

const QuickTogglesPage = GObject.registerClass(
class QuickTogglesPage extends SubPage{
    _init(settings){
        super._init('Quick Toggles', settings);

        const group = new Adw.PreferencesGroup({ title: 'Quick Toggles' });
        this.add(group);

        group.add(new DropDownRow('Style', settings, 'quick-toggles-style', ["Normal", "Separated", "Compact"]));
        group.add(new SwitchRow('Hide Notifications', settings, 'quick-toggles-hide-notifications'));
        group.add(new SwitchRow('Hide System Levels', settings, 'quick-toggles-hide-system-levels'));
        group.add(new SwitchRow('Hide Media', settings, 'quick-toggles-hide-media'));
    }
});

const AboutPage = GObject.registerClass(
class AboutPage extends Adw.PreferencesPage{
    _init(){
        super._init({
            title: 'About',
            icon_name: 'info-symbolic'
        });

        const versionGroup = new Adw.PreferencesGroup();
        let versionRow = new Adw.ActionRow({ title: 'Verison:' });
        versionRow.add_suffix(new Gtk.Label({ valign: Gtk.Align.CENTER, label: `${Me.metadata.version}`}));
        versionGroup.add(versionRow);
        this.add(versionGroup);

        const credits = new Adw.PreferencesGroup({ title: 'Took code from these projects' });
        this.add(credits);
        credits.add(this._addCredit('ArcMenu', 'by andrew.zaech', 'https://extensions.gnome.org/extension/3628/arcmenu'));
        credits.add(this._addCredit('Workspace Indicator', 'by fmullner', 'https://extensions.gnome.org/extension/21/workspace-indicator'));
        credits.add(this._addCredit('Workspaces Bar', 'by fthx', 'https://extensions.gnome.org/extension/3851/workspaces-bar'));
        credits.add(this._addCredit('Nano System Monitor', 'by eeeee', 'https://extensions.gnome.org/extension/5037/nano-system-monitor'));
        credits.add(this._addCredit('GNOME source code', '', 'https://gitlab.gnome.org/GNOME/gnome-shell/-/tree/main/js/ui'));

        const donateGroup = new Adw.PreferencesGroup({ title: 'If you would like to support my work'});
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
            label: 'Also consider donating to',
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
            title: 'Extensions',
            icon_name: 'application-x-addon-symbolic',
        });

        const settings = ExtensionUtils.getSettings();
        const group = new Adw.PreferencesGroup({ title: 'Extensions' });
        this.add(group);

        group.add(new ToggleRow(new BatteryBarPage(settings), 'battery-bar'));
        group.add(new ToggleRow(new DashBoardPage(settings), 'dash-board'));
        group.add(new ToggleRow(new DateMenuModPage(settings), 'date-menu-mod'));
        group.add(new ToggleRow(new MediaPlayerPage(settings), 'media-player'));
        group.add(new ToggleRow(new PowerMenuPage(settings), 'power-menu'));
        group.add(new ToggleRow(new WorkspaceIndicatorPage(settings), 'workspace-indicator'));
        group.add(new ToggleRow(new NotificationIndicatorPage(settings), 'notification-indicator'));
        group.add(new ToggleRow(new BackgroundClockPage(settings), 'background-clock'));

        if(GnomeVersion >= 43)
        group.add(new ToggleRow(new QuickTogglesPage(settings), 'quick-toggles'));
    }
});

function fillPreferencesWindow(window) {
    window.add(new MainPage());
    window.add(new AboutPage());
    window.search_enabled = true;
    window.can_navigate_back = true;
}
