'use strict';

const { GObject, St, Gio, Clutter, Meta, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Widgets = Me.imports.shared.dashWidgets;

const DashBoardModal = GObject.registerClass(
class DashBoardModal extends imports.ui.modalDialog.ModalDialog{
    _init(settings){
        super._init({
            destroyOnClose: false,
            shellReactive: true,
        });
        this.settings = settings;
        
        let closeBtn = this.addButton({
            action: () => this.close(),
            label: 'x',
            key: Clutter.KEY_Escape,
        });
        closeBtn.hide();
        let monitor = Main.layoutManager.primaryMonitor;
        this.dialogLayout.height = monitor.height;
        this.dialogLayout.width = monitor.width;
        this.dialogLayout.connect('button-press-event', () => this.close() );

        this.contentLayout.add_style_class_name('dashboard-content');
        this.dialogLayout._dialog.add_style_class_name('dashboard');

        this._buildUI();
        this.connect('opened', () => {
            if(this.levelsBox)
                this.levelsBox.updateLevels();
        });
    }

    _buildUI(){
        this.mainBox = new St.BoxLayout({ style_class: 'container' });
        this.contentLayout.add_child(this.mainBox);

        let layout = this.settings.get_int('dash-layout');
        switch (layout) {
            case 1: this._layout2(); break;
            case 2: this._layout3(); break;
            default: this._layout1(); break;
        }
    }

    _layout1(){
        this.userBox = new Widgets.UserBox(this, true);
        this.levelsBox = new Widgets.LevelsBox(this.settings, this, false);
        this.mediaBox = new Widgets.MediaBox(this.settings);
        this.linksBox = new Widgets.LinksBox(this.settings, this, false);
        this.clockBox = new Widgets.ClockBox(false);
        this.appBox = new Widgets.AppBox(this.settings, this);
        this.sysBox = new Widgets.SysBox(false, 32, this);
        this.sysActionsBox = new Widgets.SysActionsBox(0, 32, this);

        this.mainBox.vertical = true;

        this.userBox.x_expand = false;
        this.linksBox.y_expand = false;

        let row1 = new St.BoxLayout({ style_class: 'container' });
        let row2 = new St.BoxLayout({ style_class: 'container' });
        let row3 = new St.BoxLayout({ style_class: 'container' });
        let vbox = new St.BoxLayout({ style_class: 'container', vertical: true });

        row1.add_child(this.clockBox);
        row1.add_child(this.sysBox);
        row1.add_child(this.sysActionsBox);

        vbox.add_child(this.mediaBox);
        vbox.add_child(this.linksBox);
        row2.add_child(vbox);
        row2.add_child(this.appBox);

        row3.add_child(this.userBox);
        row3.add_child(this.levelsBox);

        this.mainBox.add_child(row1);
        this.mainBox.add_child(row2);
        this.mainBox.add_child(row3);
    }

    _layout2(){
        this.userBox = new Widgets.UserBox(this, false, 80);
        this.levelsBox = new Widgets.LevelsBox(this.settings, this, true);
        this.mediaBox = new Widgets.MediaBox(this.settings);
        this.linksBox = new Widgets.LinksBox(this.settings, this, false);
        this.clockBox = new Widgets.ClockBox(false);
        this.appBox = new Widgets.AppBox(this.settings, this);
        this.sysBox = new Widgets.SysBox(false, 34, this);
        this.sysActionsBox = new Widgets.SysActionsBox(2, 50, this);

        this.userBox.y_expand = false;
        this.linksBox.y_expand = false;

        let col1 = new St.BoxLayout({ style_class: 'container', vertical: true });
        let col2 = new St.BoxLayout({ style_class: 'container', vertical: true });
        let col3 = new St.BoxLayout({ style_class: 'container', vertical: true });
        let hbox1 = new St.BoxLayout({style_class: 'container' });

        col1.add_child(this.userBox);
        col1.add_child(this.levelsBox);

        hbox1.add_child(this.clockBox);
        hbox1.add_child(this.sysBox);
        col2.add_child(hbox1);
        col2.add_child(this.mediaBox);
        col2.add_child(this.linksBox);

        col3.add_child(this.sysActionsBox);
        col3.add_child(this.appBox);

        this.mainBox.add_child(col1);
        this.mainBox.add_child(col2);
        this.mainBox.add_child(col3);
    }
    
    _layout3(){
        this.userBox = new Widgets.UserBox(this, false, 80);
        this.levelsBox = new Widgets.LevelsBox(this.settings, this, true);
        this.mediaBox = new Widgets.MediaBox(this.settings);
        this.linksBox = new Widgets.LinksBox(this.settings, this, false);
        this.clockBox = new Widgets.ClockBox(false);
        this.appBox = new Widgets.AppBox(this.settings, this);
        this.sysBox = new Widgets.SysBox(true, 40, this);
        this.sysActionsBox = new Widgets.SysActionsBox(1, 58, this);

        this.clockBox.clock.y_expand = false;
        this.clockBox.date.y_expand = false;
        this.clockBox.day.y_expand = false;

        let col1 = new St.BoxLayout({  style_class: 'container', vertical: true });
        let col2 = new St.BoxLayout({  style_class: 'container', vertical: true });
        let hbox1 = new St.BoxLayout({ style_class: 'container' });
        let hbox2 = new St.BoxLayout({ style_class: 'container' });
        let vbox1 = new St.BoxLayout({ style_class: 'container', vertical: true });

        col1.add_child(this.clockBox);
        col1.add_child(this.mediaBox);

        hbox1.add_child(this.appBox);
        hbox1.add_child(this.sysBox);

        vbox1.add_child(this.userBox);
        vbox1.add_child(hbox1);

        hbox2.add_child(vbox1);
        hbox2.add_child(this.levelsBox);
        hbox2.add_child(this.sysActionsBox);

        col2.add_child(hbox2);
        col2.add_child(this.linksBox);

        this.mainBox.add_child(col1);
        this.mainBox.add_child(col2);
    }
});

const DashBoardPanelButton = GObject.registerClass(
class DashBoardPanelButton extends St.Button{
    _init(settings){
        super._init({
            style_class: 'panel-button dashboard'
        });
        let box = new St.BoxLayout()
        this.set_child(box);

        this.settings = settings;

        this.visible = this.settings.get_boolean('dash-button-enable');
        this.settings.connect('changed::dash-button-enable', 
            () => this.visible = this.settings.get_boolean('dash-button-enable'));
        
        //ICON
        this.buttonIcon = new St.Icon({
            gicon: Gio.icon_new_for_string(
                this.settings.get_string('dash-button-icon-path')
            ),
            style_class: 'system-status-icon',
        });
        this.settings.connect('changed::dash-button-icon-path',
            () => this.buttonIcon.set_gicon(
                Gio.icon_new_for_string(
                    this.settings.get_string('dash-button-icon-path')
                )
            )
        );
        this.buttonIcon.visible = this.settings.get_boolean('dash-button-show-icon')
        this.settings.connect('changed::dash-button-show-icon', 
            () => this.buttonIcon.visible = this.settings.get_boolean('dash-button-show-icon'));
        box.add_child(this.buttonIcon);
        
        //LABEL
        this.buttonLabel = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            text: this.settings.get_string('dash-button-label'),
        });
        this.settings.bind(
            'dash-button-label',
            this.buttonLabel,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );
        box.add_child(this.buttonLabel);

        // DASH
        this._reloadDash();
        this.settings.connect('changed::dash-layout', this._reloadDash.bind(this));
        
        //SHORTCUT
        this.connect('clicked', () => this._openDash());
        Main.wm.addKeybinding('dash-shortcut', this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._toggleDash());

        this.connect('destroy', this._onDestroy.bind(this));
    }

    _reloadDash(){
        if(this.dash) this.dash.destroy()

        this.dash = new DashBoardModal(this.settings);
        this.dash.connectObject(
            'closed', () => {
                this.remove_style_pseudo_class('active');
                this.opened = false;
            },
            'opened', () => this.opened = true,
            this 
        )
    }

    _openDash(){
        this.opened = true;
        this.dash.open();
        this.add_style_pseudo_class('active');
    }

    _closeDash(){
        this.opened = false;
        this.dash.close();
        this.remove_style_pseudo_class('active');
    }

    _toggleDash(){
        this.opened ? this._closeDash() : this._openDash()
    }

    _onDestroy(){
        Main.wm.removeKeybinding('dash-shortcut');
    }
});

var Extension = class Extension {
    constructor() {
        this.panelBox = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox
        ]
        this.activities = Main.panel.statusArea.activities.get_parent();
    }

    enable() {
        this.settings = ExtensionUtils.getSettings();

        //so it comes up in dconf editor
        this.settings.set_strv('dash-link-names', this.settings.get_strv('dash-link-names'));
        this.settings.set_strv('dash-link-urls', this.settings.get_strv('dash-link-urls'));

        this.settings.connect('changed::dash-button-position', () => this._reload());
        this.settings.connect('changed::dash-button-offset', () => this._reload());
        this.settings.connect('changed::dash-hide-activities', () => this._activites());
        
        this._activites();
        this._reload();
    }

    disable() {
        this._panelButton.destroy();
        this._panelButton = null;
        this.settings = null;
        this.activities.hide();
    }

    _activites(){
        this.settings.get_boolean('dash-hide-activities') ?
            this.activities.hide():
            this.activities.show();
    }

    _reload(){
        if(this._panelButton){
            this._panelButton.destroy();
            this._panelButton = null;
        }
        this._panelButton = new DashBoardPanelButton(this.settings);

        let pos = this.settings.get_int('dash-button-position');
        let offset = this.settings.get_int('dash-button-offset');
        this.panelBox[pos].insert_child_at_index(this._panelButton, offset);
    }
}
