'use strict';

const { Adw, Gio, Gtk, GObject, Gdk, GdkPixbuf } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const GnomeVersion = Math.floor(imports.misc.config.PACKAGE_VERSION);

var SpinButtonRow = GObject.registerClass(
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

var EntryRow = GObject.registerClass(
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

var DropDownRow = GObject.registerClass(
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

var SwitchRow = GObject.registerClass(
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

var ColorRow = GObject.registerClass(
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

var ExpanderRow = GObject.registerClass(
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

var PositionRow = GObject.registerClass(
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

var FileChooserButton = GObject.registerClass(
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
var HotkeyDialog = GObject.registerClass({
    Signals: {
        'response': { param_types: [GObject.TYPE_INT] },
    },
},
class HotkeyDialog extends Gtk.Window {
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