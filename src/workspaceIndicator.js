// this is a fork of this
// https://github.com/fthx/workspaces-bar
'use strict';

const { Clutter, Gio, GObject, Shell, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var WorkspacesBar = GObject.registerClass(
class WorkspacesBar extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Workspaces Indicator', true);

        this.add_style_class_name('workspace-indicator')
        this.ws_bar = new St.BoxLayout();
        this.add_child(this.ws_bar);
        
		this._ws_active_changed = global.workspace_manager.connect('active-workspace-changed', this._update_ws.bind(this));
		this._ws_number_changed = global.workspace_manager.connect('notify::n-workspaces', this._update_ws.bind(this));
		this._restacked = global.display.connect('restacked', this._update_ws.bind(this));
		this._windows_changed = Shell.WindowTracker.get_default().connect('tracked-windows-changed', this._update_ws.bind(this));

        this.connect('destroy', () => {
            if (this._ws_active_changed) {
                global.workspace_manager.disconnect(this._ws_active_changed);
            }
            if (this._ws_number_changed) {
                global.workspace_manager.disconnect(this._ws_number_changed);
            }
            if (this._restacked) {
                global.display.disconnect(this._restacked);
            }
            if (this._windows_changed) {
                Shell.WindowTracker.get_default().disconnect(this._windows_changed);
            }
            this.ws_bar.destroy();
        });

        this._update_ws();
	}

	// update the workspaces bar
    _update_ws() {
    	// destroy old workspaces bar buttons
    	this.ws_bar.destroy_all_children();
    	
    	// get number of workspaces
        this.ws_count = global.workspace_manager.get_n_workspaces();
        this.active_ws_index = global.workspace_manager.get_active_workspace_index();
		
		// display all current workspaces buttons
        for (let ws_index = 0; ws_index < this.ws_count; ++ws_index) {
			this.ws_box = new St.Bin({visible: true, reactive: true, can_focus: true, track_hover: true});						
			this.ws_box.icon = new St.Icon({ y_align: Clutter.ActorAlign.CENTER, style_class: 'system-status-icon' });
			if (ws_index == this.active_ws_index) {
				this.ws_box.icon.gicon = Gio.icon_new_for_string(Me.dir.get_path()+'/media/circle-filled-symbolic.svg');
			} else {
				this.ws_box.icon.gicon = Gio.icon_new_for_string(Me.dir.get_path()+'/media/circle-symbolic.svg');
			}
			this.ws_box.set_child(this.ws_box.icon);
			this.ws_box.connect('button-release-event', () => this._toggle_ws(ws_index) );
	        this.ws_bar.add_actor(this.ws_box);
		}
    }

    // activate workspace or show overview
    _toggle_ws(ws_index) {
		if (global.workspace_manager.get_active_workspace_index() == ws_index) {
			Main.overview.toggle();
		} else {
			global.workspace_manager.get_workspace_by_index(ws_index).activate(global.get_current_time());
		}
    }
});

var Extension = class Extension {
    constructor() {
        this.pos = [
            'left',
            'center',
            'right',
        ]
    }

    enable() {
        this.settings = ExtensionUtils.getSettings();
        this.settings.connect('changed::workspace-indicator-offset', () => this.addToPanel());
        this.settings.connect('changed::workspace-indicator-position', () => this.addToPanel());
        this.addToPanel();
    }

    disable() {
    	this.panelButton.destroy();
		this.panelButton = null;
        this.settings = null;
    }

    addToPanel(){
        if(this.panelButton){
            this.panelButton.destroy();
            this.panelButton = null;
        }
        this.panelButton = new WorkspacesBar();

        let pos = this.settings.get_int('workspace-indicator-position');
        let offset = this.settings.get_int('workspace-indicator-offset');

        Main.panel.addToStatusArea('Workspaces Indicator', this.panelButton, offset, this.pos[pos]);
    }
}