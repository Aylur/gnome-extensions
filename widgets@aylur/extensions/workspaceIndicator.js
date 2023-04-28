// fork of https://github.com/fthx/workspaces-bar
const { Clutter, Gio, GObject, Shell, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

var WorkspacesIndicator = GObject.registerClass(
class WorkspacesIndicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0, _('Workspace Indicator'), true);
        this._compact = settings.get_int('workspace-indicator-style'); //0-compact 1-seperated
        this._spacing = settings.get_int('workspace-indicator-spacing');
        this._showNames  = settings.get_boolean('workspace-indicator-show-names');
        this._activeName = settings.get_string('workspace-indicator-active-name');
        
        this._ws_active_changed = global.workspace_manager.connect('active-workspace-changed', this._sync.bind(this));
	this._ws_number_changed = global.workspace_manager.connect('notify::n-workspaces', this._sync.bind(this));
	this._restacked = global.display.connect('restacked', this._sync.bind(this));
	this._windows_changed = Shell.WindowTracker.get_default().connect('tracked-windows-changed', this._sync.bind(this));
        this._workspaces_settings = new Gio.Settings({ schema: 'org.gnome.desktop.wm.preferences' });
	this._workspaces_names_changed = this._workspaces_settings.connect('changed::workspace-names', this._sync.bind(this));	

        this.connect('destroy', this._onDestroy.bind(this));

        this._sync();
    }

    _onDestroy(){
        global.workspace_manager.disconnect(this._ws_active_changed);
        global.workspace_manager.disconnect(this._ws_number_changed);
        global.display.disconnect(this._restacked);
        Shell.WindowTracker.get_default().disconnect(this._windows_changed);
        this._workspaces_settings.disconnect(this._workspaces_names_changed);
        this._workspaces_settings = null;
    }

    _sync() {
    	this.destroy_all_children();
        let box = new St.BoxLayout();
        this.add_child(box);
    	
        const ws_count = global.workspace_manager.get_n_workspaces();
        const active_ws_index = global.workspace_manager.get_active_workspace_index();
	const workspaces_names = this._workspaces_settings.get_strv('workspace-names');
		
        for (let index = 0; index < ws_count; ++index) {
            let active = index === active_ws_index;
            
	    let ws_btn = new St.Button({
                can_focus: true,
                style_class: active ?
                    'workspace-indicator-active':
                    'workspace-indicator-inactive',
                style: `padding: 0 ${this._spacing}px`,
            });
            if(this._compact) {
                ws_btn.add_style_class_name('panel-button');
                this.style_class = 'workspace-indicator';
                this.track_hover = false;
            }else{
                this.style_class = 'panel-button workspace-indicator';
                this.track_hover = true;
            } 

            if(this._showNames)
                ws_btn.set_child(new St.Label({
                    y_align: Clutter.ActorAlign.CENTER,
                    text: active && this._activeName !== '' ?
                        activeName :
                        workspaces_names[index] || `${ index + 1 }`,
                }));
            else
                ws_btn.set_child(new St.Icon({
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'system-status-icon',
                    gicon : active
                        ? Gio.icon_new_for_string(Me.path+'/media/workspace-active-symbolic.svg')
                        : Gio.icon_new_for_string(Me.path+'/media/workspace-symbolic.svg')
                }));

	    ws_btn.connect('clicked', () => this._toggle_ws(index) );
	    box.add_child(ws_btn);
	}
    }

    _toggle_ws(index) {
	global.workspace_manager.get_active_workspace_index() == index
            ? Main.overview.toggle()
            : global.workspace_manager.get_workspace_by_index(index).activate(global.get_current_time());
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
            'changed::workspace-indicator-style',        this._reload.bind(this),
            'changed::workspace-indicator-offset',       this._reload.bind(this),
            'changed::workspace-indicator-position',     this._reload.bind(this),
            'changed::workspace-indicator-show-names',   this._reload.bind(this),
            'changed::workspace-indicator-active-name',  this._reload.bind(this),
            'changed::workspace-indicator-spacing',      this._reload.bind(this),
            this
        );
        this._reload();
    }

    disable() {
    	this._panelButton.destroy();
        this._panelButton = null;
        this._settings.disconnectObject(this);
    }

    _reload(){
        if (this._panelButton){
            this._panelButton.destroy();
            this._panelButton = null;
        }
        
        this._panelButton = new WorkspacesIndicator(this._settings);
        let pos    = this._settings.get_int('workspace-indicator-position');
        let offset = this._settings.get_int('workspace-indicator-offset');
        Main.panel.addToStatusArea(_('Workspace Indicator'), this._panelButton, offset, this.pos[pos]);
    }
}
