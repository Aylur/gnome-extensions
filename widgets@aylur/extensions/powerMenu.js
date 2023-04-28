const { GObject, St, Clutter } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const SystemActions = imports.misc.systemActions;
const ModalDialog = imports.ui.modalDialog;
const PanelMenu = imports.ui.panelMenu;

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

const PowerButton = GObject.registerClass(
class PowerButton extends St.Button{
    _init(powerIcon, powerLabel, action, parentDialog){
        super._init({ style_class: action });
        this._settings = parentDialog._settings;

        this.action = action;
        this.parentDialog = parentDialog;

        this.radius = this._settings.get_int('power-menu-button-roundness');
        this.padding = this._settings.get_int('power-menu-icon-padding');

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

    _onClick(){
        SystemActions.getDefault().activateAction(this.action);
        if(this.parentDialog)
            this.parentDialog.close();
    }

    _inside(){
        let box = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(this._icon);
        box.add_child(this._label);
        this.set_child(box);

        this.style_class = 'button';
        this.can_focus = true;

        //icon-size + label (assume it's 16px) + padding;
        let size = this._icon.icon_size + 16 +
            this._settings.get_int('power-menu-icon-padding') * 2;
        this.style = `
            padding: ${this.padding/2}px;
            border-radius: ${this.radius}px;
            width: ${size}px;    
            height: ${size}px;    
        `;
        this._icon.style = `padding: ${this.padding/2}px;`;

        this.connect('clicked', () => this._onClick());
    }

    _outside(){
        let box = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        let btn = new St.Button({
            style_class: 'button',
            can_focus: true,
            child: this._icon,
            style: `padding: ${this.padding}px;
                    margin-bottom: ${this.padding/2}px;
                    border-radius: ${this.radius}px;`,
        })

        box.add_child(btn);
        box.add_child(this._label);
        this.set_child(box);

        btn.connect('clicked', () => this._onClick());
    }

    _hidden(){
        this.style_class = 'button';
        this.style = `border-radius: ${this.radius}px;`;
        this._icon.style = `padding: ${this.padding}px;`;

        this.can_focus = true;
        this.set_child(this._icon);
        this.connect('clicked', () => this._onClick());
    }
});

const PowerDialog = GObject.registerClass(
class PowerDialog extends ModalDialog.ModalDialog{
    _init(settings){
        super._init();
        this._settings = settings;

        this.dialogLayout._dialog.add_style_class_name('power-menu');
        this.dialogLayout._dialog.style = `
            padding: ${settings.get_int('power-menu-dialog-padding')}px;
            border-radius: ${settings.get_int('power-menu-dialog-roundness')}px;
        `;
        
        this.spacing = `spacing: ${settings.get_int('power-menu-dialog-spacing')}px;`;
        this.contentLayout.style = `margin: 0;`;

        if(!settings.get_boolean('power-menu-dialog-show-bg')){
            this.dialogLayout._dialog.style += `
                background-color: transparent;
                border: none;
                box-shadow: none;
            `;
        }

        let closeBtn = this.addButton({
            action: () => this.close(),
            label: _('Cancel'),
            key: Clutter.KEY_Escape,
        });
        closeBtn.hide();
        
        let monitor = Main.layoutManager.primaryMonitor;
        this.dialogLayout.height = monitor.height;
        this.dialogLayout.width = monitor.width;
        this.dialogLayout.connect('button-press-event', () => this.close() );

        this._buildUI();
    }

    _buildUI(){
        switch (this._settings.get_int('power-menu-layout')) {
            case 0: this.layout2x2(); break;
            default: this.layout1x4(); break;
        }
    }

    layout2x2(){
        let vbox = new St.BoxLayout({ style: this.spacing, vertical: true });
        let hbox1 = new St.BoxLayout({ style: this.spacing });
        let hbox2 = new St.BoxLayout({ style: this.spacing });
        hbox1.add_child(new PowerButton('system-reboot-symbolic', _('Restart'), 'restart', this));
        hbox1.add_child(new PowerButton('system-shutdown-symbolic', _('Shutdown'), 'power-off', this));
        hbox2.add_child(new PowerButton('weather-clear-night-symbolic', _('Suspend'), 'suspend', this));
        hbox2.add_child(new PowerButton('system-log-out-symbolic', _('Log Out'), 'logout', this));
        vbox.add_child(hbox1);
        vbox.add_child(hbox2);
        this.contentLayout.add_child(vbox);
    }

    layout1x4(){
        let hbox = new St.BoxLayout({ style: this.spacing });
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
        super._init(0, 'Power Menu', true);
        this._settings = settings;

        this.add_style_class_name('power-menu-panel-button');
        this.add_child(new St.Icon({
            icon_name: 'system-shutdown-symbolic',
            style_class: 'system-status-icon',
        }));

        this.connect('button-press-event',
            () => this._showDialog());

        this.connect('destroy', () => {
            if(this.dialog)
                this.dialog.close();
        });
    }

    _showDialog(){
        this.dialog = new PowerDialog(this._settings);
        this.dialog.open();
    }
});

var Extension = class Extension {
    constructor(settings) {
        this._settings = settings;
        this.pos = [
            'left',
            'center',
            'right'
        ];
    }

    enable() {
        this._settings.connectObject(
            'changed::power-menu-position', this._addToPanel.bind(this),
            this
        );
        this._addToPanel();
    }

    disable() {
        this._panelButton.destroy();
        this._panelButton = null;
        this._settings.disconnectObject(this);
    }

    _addToPanel(){
        if(this._panelButton){
            this._panelButton.destroy();
            this._panelButton = null;
        }

        this._panelButton = new PowerMenu(this._settings);
        let pos = this._settings.get_int('power-menu-position');
        let offset = this._settings.get_int('power-menu-offset');
        Main.panel.addToStatusArea('Power Menu', this._panelButton, offset, this.pos[pos]);
    }
}
