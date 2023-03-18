const { GObject, St, Gio, Clutter, Meta, Shell } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Widgets = Me.imports.shared.dashWidgets;
const ConfigParser = Me.imports.shared.dashConfigParser;

const DashBoardModal = GObject.registerClass(
class DashBoardModal extends imports.ui.modalDialog.ModalDialog{
    _init(settings){
        super._init({
            destroyOnClose: false,
            shellReactive: true,
        });
        this._settings = settings;
        
        let closeBtn = this.addButton({
            action: () => this.close(),
            label: 'x',
            key: Clutter.KEY_Escape,
        });
        closeBtn.hide();
        this.connect('button-press-event', () => this.close() );

        this.dialogLayout._dialog.add_style_class_name('dashboard');
        
        this._settings.connectObject(
            'changed::dash-board-x-align',  () => this._syncStyle(),
            'changed::dash-board-y-align',  () => this._syncStyle(),
            'changed::dash-board-x-offset', () => this._syncStyle(),
            'changed::dash-board-y-offset', () => this._syncStyle(),
            'changed::dash-board-darken',   () => this._syncStyle(),
            'changed::dash-layout-json',    () => this._buildUI(),
            'changed::dash-read-config',    () => this._readConfig(),
            this
        );
        this.connectObject(
            'opened', () => {
                if(this.levelsBox)
                    this.levelsBox.updateLevels();
            },
            'destroy', () => {
                this._settings.disconnectObject(this);
            },
            this
        );

        this._buildUI();
    }

    _syncStyle(){
        this.dialogLayout._dialog.x_align = this._parseAlign(this._settings.get_int('dash-board-x-align'));
        this.dialogLayout._dialog.y_align = this._parseAlign(this._settings.get_int('dash-board-y-align'));
        this.dialogLayout._dialog.x_expand = true;
        this.dialogLayout._dialog.y_expand = true;
        let x_offset = this._settings.get_int('dash-board-x-offset');
        let y_offset = this._settings.get_int('dash-board-y-offset');

        this.dialogLayout.style = `
            padding-top: ${y_offset < 0 ? y_offset*(-1) : 0}px;
            padding-bottom: ${y_offset > 0 ? y_offset : 0}px;
            padding-right: ${x_offset < 0 ? x_offset*(-1) : 0}px;
            padding-left: ${x_offset > 0 ? x_offset : 0}px;
        `;

        this._settings.get_boolean('dash-board-darken') ?
            this.style = 'background-color: rgba(0,0,0,0.6);':
            this.style = 'background-color: transparent';
    }

    _buildUI(){
        if(this._mainBox){
            this._mainBox.destroy();
            this._mainBox = null;
        }

        this._widgetList = {
            apps: () =>     { return new Widgets.AppsWidget(    this._settings, this); },
            clock: () =>    { return new Widgets.ClockWidget(   this._settings, this); },
            levels: () =>   { return new Widgets.LevelsWidget(  this._settings, this); },
            links: () =>    { return new Widgets.LinksWidget(   this._settings, this); },
            media: () =>    { return new Widgets.MediaWidget(   this._settings, this); },
            settings: () => { return new Widgets.SettingsWidget(this._settings, this); },
            system: () =>   { return new Widgets.SystemWidget(  this._settings, this); },
            user: () =>     { return new Widgets.UserWidget(    this._settings, this); },
        }

        let layout = JSON.parse(this._settings.get_string('dash-layout-json'));
        this._mainBox = this._parseJson(layout);
        this.contentLayout.add_child( this._mainBox );

        this._syncStyle();
    }

    _parseJson(obj){
        if(typeof obj === 'string' && this._widgetList[obj]) return this._widgetList[obj]();
        let box = new St.BoxLayout({
            style_class: 'container',
            vertical: obj.vertical || false,
            y_expand: obj.y_expand || false,
            x_expand: obj.x_expand || false,
            style: `
                ${obj.width ? `widht: ${obj.width}px;` : ''}
                ${obj.height ? `widht: ${obj.height}px;` : ''}
            `,
            y_align: this._parseAlign(obj.y_align),
            x_align: this._parseAlign(obj.x_align)
        });
        obj.children?.forEach(ch => box.add_child(this._parseJson(ch)));
        return box;
    }

    _parseAlign(align){
        switch (align) {
            case 'START': return Clutter.ActorAlign.START;
            case 'CENTER': return Clutter.ActorAlign.CENTER;
            case 'END': return Clutter.ActorAlign.END;
            case 1: return Clutter.ActorAlign.START;
            case 2: return Clutter.ActorAlign.CENTER;
            case 3: return Clutter.ActorAlign.END;
            default: return Clutter.ActorAlign.FILL;
        }
    }

    _readConfig(){
        try {
            let file = Gio.File.new_for_path(`${Me.path}/config/dashboard.json`);
            let [, contents, etag] = file.load_contents(null);
            contents instanceof Uint8Array ?
                contents = imports.byteArray.toString(contents) :
                contents = contents.toString();

            ConfigParser.parseJson(JSON.parse(contents), this._settings);
        } catch (error) {
            log(error);
            Main.notify('There was an error while parsing Dash Board config', 'Check your config and make sure it is formatted correctly!');
        }
    }
});

const DashBoardPanelButton = GObject.registerClass(
class DashBoardPanelButton extends St.Button{
    _init(settings){
        super._init({ style_class: 'panel-button dashboard-button' });
        this._settings = settings;
        let box = new St.BoxLayout();
        this.set_child(box);

        this._buttonIcon = new St.Icon({ style_class: 'system-status-icon' });
        this._buttonLabel = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
        box.add_child(this._buttonIcon);
        box.add_child(this._buttonLabel);

        this._settings.connectObject(
            'changed::dash-button-enable', () => this._sync(),
            'changed::dash-button-show-icon', () => this._sync(),
            'changed::dash-button-icon-path', () => this._sync(),
            'changed::dash-button-label', () => this._sync(),
            'changed::dash-layout', () => this._sync(),
            this
        );

        this.connect('destroy', () => this._onDestroy() );
        this.connect('clicked', () => this._toggleDash() );
        this._sync();

        Main.wm.addKeybinding('dash-shortcut', this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._toggleDash());
    }

    _onDestroy(){
        this._settings.disconnectObject(this);
        Main.wm.removeKeybinding('dash-shortcut');
        if(this._dash) this._dash.destroy();
    }

    _openDash(){
        this._opened = true;
        this._dash.open();
        this.add_style_pseudo_class('active');
    }

    _closeDash(){
        this._opened = false;
        this._dash.close();
        this.remove_style_pseudo_class('active');
    }

    _toggleDash(){
        this._opened ? this._closeDash() : this._openDash()
    }

    _sync(){
        this.visible = this._settings.get_boolean('dash-button-enable');
        this._buttonIcon.visible = this._settings.get_boolean('dash-button-show-icon');
        this._buttonIcon.gicon = Gio.icon_new_for_string(
            this._settings.get_string('dash-button-icon-path')
        );
        this._buttonLabel.text = this._settings.get_string('dash-button-label');

        if(this._dash){
            this._dash.destroy();
            this._dash = null;
        }
        this._dash = new DashBoardModal(this._settings);
        this._dash.connectObject(
            'closed', () => {
                this.remove_style_pseudo_class('active');
                this._opened = false;
            },
            'opened', () => {
                this.add_style_pseudo_class('active');
                this._opened = true;
            },
            'destroy', () => {
                this._dash.disconnectObject(this);
            },
            this
        );
    }
});

var Extension = class Extension {
    constructor(settings) {
        this._settings = settings;
        this._panelBox = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox
        ];
        this.activities = Main.panel.statusArea.activities.get_parent();
    }

    enable() {
        //so it comes up in dconf editor
        this._settings.set_strv('dash-links-names', this._settings.get_strv('dash-links-names'));
        this._settings.set_strv('dash-links-urls',  this._settings.get_strv('dash-links-urls'));

        this._settings.connectObject(
            'changed::dash-button-position', this._reload.bind(this),
            'changed::dash-button-offset', this._reload.bind(this),
            'changed::dash-hide-activities', this._activites.bind(this),
            this
        );
        
        this._activites();
        this._reload();
    }

    disable() {
        this._panelButton.destroy();
        this._panelButton = null;
        this._settings.disconnectObject(this);
        this.activities.show();
    }

    _activites(){
        this._settings.get_boolean('dash-hide-activities') ?
            this.activities.hide():
            this.activities.show();
    }

    _reload(){
        if(this._panelButton){
            this._panelButton.destroy();
            this._panelButton = null;
        }

        this._panelButton = new St.Bin({
            child: new DashBoardPanelButton(this._settings)
        }); 

        let pos = this._settings.get_int('dash-button-position');
        let offset = this._settings.get_int('dash-button-offset');
        this._panelBox[pos].insert_child_at_index(this._panelButton, offset);
    }
}
