/* exported Extension */

const {GObject, St, Clutter} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const SystemActions = imports.misc.systemActions;
const ModalDialog = imports.ui.modalDialog;
const PanelMenu = imports.ui.panelMenu;
const {PanelButton} = Me.imports.shared.panelButton;

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

const PowerButton = GObject.registerClass(
class PowerButton extends St.Button {
    _init(powerIcon, powerLabel, action, parentDialog) {
        super._init({style_class: action});
        this._settings = parentDialog._settings;

        this._action = action;
        this._parentDialog = parentDialog;

        this._radius = this._settings.get_int('power-menu-button-roundness');
        this._padding = this._settings.get_int('power-menu-icon-padding');

        this._icon = new St.Icon({
            icon_name: powerIcon,
            icon_size: this._settings.get_int('power-menu-icon-size'),
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._label = new St.Label({
            text: powerLabel,
            x_align: Clutter.ActorAlign.CENTER,
        });

        switch (this._settings.get_int('power-menu-label-position')) {
        case 0: this._inside(); break;
        case 1: this._outside(); break;
        default: this._hidden(); break;
        }
    }

    vfunc_clicked() {
        SystemActions.getDefault().activateAction(this._action);
        if (this._parentDialog)
            this._parentDialog.close();
    }

    _inside() {
        const box = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(this._icon);
        box.add_child(this._label);
        this.set_child(box);

        this.style_class = 'button';
        this.can_focus = true;

        // icon-size + label (assume it's 16px) + padding;
        const size = this._icon.icon_size + 16 +
            this._settings.get_int('power-menu-icon-padding') * 2;
        this.style = `
            padding: ${this._padding / 2}px;
            border-radius: ${this._radius}px;
            width: ${size}px;    
            height: ${size}px;    
        `;
        this._icon.style = `padding: ${this._padding / 2}px;`;
    }

    _outside() {
        const box = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const btn = new St.Button({
            style_class: 'button',
            can_focus: true,
            child: this._icon,
            style: `padding: ${this._padding}px;
                    margin-bottom: ${this._padding / 2}px;
                    border-radius: ${this._radius}px;`,
        });
        btn.connect('clicked', this.vfunc_clicked.bind(this));
        btn.bind_property('hover', this, 'hover',
            GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);

        box.add_child(btn);
        box.add_child(this._label);
        this.set_child(box);
    }

    _hidden() {
        this.style_class = 'button';
        this.style = `border-radius: ${this._radius}px;`;
        this._icon.style = `padding: ${this._padding}px;`;

        this.can_focus = true;
        this.set_child(this._icon);
    }
});

const PowerDialog = GObject.registerClass(
class PowerDialog extends ModalDialog.ModalDialog {
    _init(settings) {
        super._init();
        this._settings = settings;

        this.dialogLayout._dialog.add_style_class_name('power-menu');
        this.dialogLayout._dialog.style = `
            padding: ${settings.get_int('power-menu-dialog-padding')}px;
            border-radius: ${settings.get_int('power-menu-dialog-roundness')}px;
        `;

        this._spacing = `spacing: ${settings.get_int('power-menu-dialog-spacing')}px;`;
        this.contentLayout.style = 'margin: 0;';

        if (!settings.get_boolean('power-menu-dialog-show-bg')) {
            this.dialogLayout._dialog.style += `
                background-color: transparent;
                border: none;
                box-shadow: none;
            `;
        }

        const closeBtn = this.addButton({
            action: () => this.close(),
            label: _('Cancel'),
            key: Clutter.KEY_Escape,
        });
        closeBtn.hide();

        const monitor = Main.layoutManager.primaryMonitor;
        this.dialogLayout.height = monitor.height;
        this.dialogLayout.width = monitor.width;
        this.dialogLayout.connect('button-press-event', () => this.close());

        this._buildUI();
    }

    _buildUI() {
        switch (this._settings.get_int('power-menu-layout')) {
        case 0: this.layout2x2(); break;
        default: this.layout1x4(); break;
        }
    }

    layout2x2() {
        const vbox = new St.BoxLayout({style: this._spacing, vertical: true});
        const hbox1 = new St.BoxLayout({style: this._spacing});
        const hbox2 = new St.BoxLayout({style: this._spacing});
        hbox1.add_child(new PowerButton('system-reboot-symbolic', _('Restart'), 'restart', this));
        hbox1.add_child(new PowerButton('system-shutdown-symbolic', _('Shutdown'), 'power-off', this));
        hbox2.add_child(new PowerButton('weather-clear-night-symbolic', _('Suspend'), 'suspend', this));
        hbox2.add_child(new PowerButton('system-log-out-symbolic', _('Log Out'), 'logout', this));
        vbox.add_child(hbox1);
        vbox.add_child(hbox2);
        this.contentLayout.add_child(vbox);
    }

    layout1x4() {
        const hbox = new St.BoxLayout({style: this._spacing});
        hbox.add_child(new PowerButton('weather-clear-night-symbolic', _('Suspend'), 'suspend', this));
        hbox.add_child(new PowerButton('system-log-out-symbolic', _('Log Out'), 'logout', this));
        hbox.add_child(new PowerButton('system-reboot-symbolic', _('Restart'), 'restart', this));
        hbox.add_child(new PowerButton('system-shutdown-symbolic', _('Shutdown'), 'power-off', this));
        this.contentLayout.add_child(hbox);
    }
});

const PowerMenu = GObject.registerClass(
class PowerMenu extends PanelMenu.Button {
    _init(settings) {
        super._init(0, _('Power Menu'), true);
        this._settings = settings;

        this.add_style_class_name('power-menu-panel-button');
        this.add_child(new St.Icon({
            icon_name: 'system-shutdown-symbolic',
            style_class: 'system-status-icon',
        }));

        this.connect('button-press-event',
            () => this._showDialog());

        this.connect('destroy', () => {
            if (this._dialog)
                this._dialog.close();
        });
    }

    _showDialog() {
        this._dialog = new PowerDialog(this._settings);
        this._dialog.open();
    }
});

var Extension = class Extension {
    constructor(settings) {
        this._extension = new PanelButton({
            settings,
            indicator: PowerMenu,
            name: 'power-menu',
            signals: [
                'power-menu-position',
                'power-menu-offset',
            ],
        });
    }

    enable() {
        this._extension.enable();
    }

    disable() {
        this._extension.disable();
    }
};
