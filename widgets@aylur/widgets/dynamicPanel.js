'use strict';

const { St, Meta, GLib } = imports.gi;
const Main = imports.ui.main;
const Panel = Main.panel;

var Extension = class Extension{
    constructor(settings){
        this._settings = settings;
    }

    enable(){
        this._windowSignals = new Map();
        
        this._connect([
            [ this._settings, 'changed::dynamic-panel-floating-style', this._onSettingsChanged.bind(this)],
            [ this._settings, 'changed::dynamic-panel-useless-gaps', this._onSettingsChanged.bind(this)],
            [ Main.overview, 'showing', this._sync.bind(this) ],
            [ Main.overview, 'hiding', this._sync.bind(this) ],
            [ Main.sessionMode, 'updated', this._sync.bind(this) ],
            [ global.window_manager, 'switch-workspace', this._sync.bind(this)],
            [ global.window_group, 'actor-added', this._onWindowAdded.bind(this) ],
            [ global.window_group, 'actor-removed', this._onWindowRemoved.bind(this) ]
        ]);

        for (const window of global.get_window_actors())
            this._onWindowAdded(null, window);

        this._onSettingsChanged();
        Main.panel.add_style_class_name('dynamic')
    }

    disable(){
        this._connections.forEach(c => c.obj.disconnect(c.id) );
        this._connections = null;

        for (const [window, ids] of this._windowSignals)
            for (const id of ids)
                window.disconnect(id);

        this._windowSignals.clear();
        this._overlap(false);
        Main.panel.remove_style_class_name('floating');
        Main.panel.remove_style_class_name('dynamic');
    }

    _onSettingsChanged(){
        this._gaps = this._settings.get_int('dynamic-panel-useless-gaps');
        this._settings.get_boolean('dynamic-panel-floating-style')  
            ? Main.panel.add_style_class_name('floating')  
            : Main.panel.remove_style_class_name('floating');

        this._sync();
    }

    _connect(list){
        this._connections = [];

        list.forEach(c => {
            let [obj, signal, callback] = c;
            this._connections.push({
                id: obj.connect(signal, callback),
                obj : obj
            })
        });
    }

    _onWindowAdded(_container, window){
        this._windowSignals.set(window, [
            window.connect('notify::allocation', () => this._sync() ),
            window.connect('notify::visible', () => this._sync() ),
        ]);
        this._sync();
    }

    _onWindowRemoved(_container, window){
        for (const id of this._windowSignals.get(window))
            window.disconnect(id);
        
        this._windowSignals.delete(window);
        this._sync();
    }

    _sync(){
        if(Main.panel.has_style_pseudo_class('overview'))
            return this._overlap(false);
        
        const workspace = global.workspace_manager.get_active_workspace();
        const windows = workspace.list_windows().filter(window =>
            window.showing_on_its_workspace()
            && !window.is_hidden()
            && window.get_window_type() !== Meta.WindowType.DESKTOP
            // exclude Desktop Icons NG
            && window.get_gtk_application_id() !== "com.rastersoft.ding"
        );

        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        const panel_top = Panel.get_transformed_position()[1];
        const panel_bottom = panel_top + Panel.get_height();
        
        let overlaps = true;
        windows.forEach(window => {
            const monitor_index = window.get_monitor();
            const primary_index = Main.layoutManager.primaryMonitor.index;
            if(monitor_index !== primary_index)
                return;

            const window_y_pos = window.get_frame_rect().y;
            if(window_y_pos < (panel_bottom + this._gaps) * scale)
                overlaps = false;
        })
        this._overlap(overlaps);
    }

    _overlap(b){
        b ? Main.panel.add_style_pseudo_class('overlaps')
          : Main.panel.remove_style_pseudo_class('overlaps');
    }
}
