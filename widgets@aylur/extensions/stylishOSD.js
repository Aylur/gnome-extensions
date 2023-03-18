const { Clutter, GObject, St, GLib, Meta } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const { OsdWindowManager }= imports.ui.osdWindow;
const { LevelBar } = Me.imports.shared.levelBar;
const { MonitorConstraint } = imports.ui.layout;

const HIDE_TIMEOUT = 1500;
const FADE_TIME = 100;

const OsdWidget = GObject.registerClass(
class OsdWidget extends St.Bin{
    _init(settings, monitorIndex){
        super._init({ visible: false });

        this._icon = new St.Icon({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        this._iconBin = new St.Bin({ child: this._icon });
        this._level = new LevelBar({ style_class: 'calendar' });
        this._level._fillLevel.add_style_class_name('calendar-today');
        this._level._fillLevel.add_style_pseudo_class('selected');
        this._level._fillLevel.set_child(this._iconBin);
        this.child = new St.Bin({
            style_class: 'osd-window',
            child: this._level
        });

        this._setings = settings;
        settings.connectObject(
            'changed::stylish-osd-position', this._updateStyle.bind(this),
            'changed::stylish-osd-vertical', this._updateStyle.bind(this),
            'changed::stylish-osd-width',    this._updateStyle.bind(this),
            'changed::stylish-osd-height',   this._updateStyle.bind(this),
            'changed::stylish-osd-padding',  this._updateStyle.bind(this),
            'changed::stylish-osd-roundness',this._updateStyle.bind(this),
            'changed::stylish-osd-icon-size',this._updateStyle.bind(this),
            this
        );
        this.connect('destroy', this._onDestroy.bind(this));
        this._updateStyle();

        this.add_constraint(new MonitorConstraint({ index: monitorIndex }));
        Main.uiGroup.add_child(this);
    }

    _onDestroy(){
        this._setings.disconnectObject(this);
    }

    _updateStyle(){
        let pos = this._setings.get_int('stylish-osd-position');
        let vertical = this._setings.get_boolean('stylish-osd-vertical'); 
        let width = this._setings.get_int('stylish-osd-width');    
        let height = this._setings.get_int('stylish-osd-height');   
        let padding = this._setings.get_int('stylish-osd-padding');
        let margin = this._setings.get_int('stylish-osd-margin');
        let radii = this._setings.get_int('stylish-osd-roundness');
        let iconSize = this._setings.get_int('stylish-osd-icon-size');

        let cal = [
            Clutter.ActorAlign.START,
            Clutter.ActorAlign.CENTER,
            Clutter.ActorAlign.END
        ];
        let x_pos = pos % 3;
        let y_pos = Math.floor(pos / 3);
        this.child.y_align = cal[y_pos];
        this.child.x_align = cal[x_pos];
        this.child.width = width;
        this.child.height = height;

        this._iconBin.y_align = vertical ? Clutter.ActorAlign.END : Clutter.ActorAlign.CENTER;
        this._iconBin.x_align = vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START;        
        this._icon.icon_size = iconSize;
        this._iconBin.width = iconSize;
        this._iconBin.height = iconSize;
        this._iconBin.style = `
            margin: ${((vertical ? width : height) - iconSize) /4}px;
        `;

        this._level.zero = iconSize;
        this._level.vertical = vertical;
        this._level.roundness = radii;
        this.child.style = `
            border-radius: ${radii > 0 ? radii+padding : 0}px;
            padding: ${padding}px;
            margin: ${margin}px;
        `;
    }

    setLabel() { } //for compatibility
    setMaxLevel() { } //for compatibility

    setIcon(icon) { this._icon.gicon = icon }

    setLevel(value) {
        this._level.visible = value != undefined;
        if (value != undefined) {
            this.visible
                ? this._level.animate(value)
                : this._level.value = value;
        }
    }

    show() {
        if (!this._icon.gicon)
            return;

        if (!this.visible) {
            Meta.disable_unredirect_for_display(global.display);
            super.show();
            this.opacity = 0;
            this.get_parent().set_child_above_sibling(this, null);

            this.ease({
                opacity: 255,
                duration: FADE_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }

        if (this._hideTimeoutId)
            GLib.source_remove(this._hideTimeoutId);
        this._hideTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT, HIDE_TIMEOUT, this._hide.bind(this));
        GLib.Source.set_name_by_id(this._hideTimeoutId, '[gnome-shell] this._hide');
    }

    cancel() {
        if (!this._hideTimeoutId)
            return;

        GLib.source_remove(this._hideTimeoutId);
        this._hide();
    }

    _hide() {
        this._hideTimeoutId = 0;
        this.ease({
            opacity: 0,
            duration: FADE_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                super.hide();
                Meta.enable_unredirect_for_display(global.display);
            },
        });
        return GLib.SOURCE_REMOVE;
    }
});

var Extension = class Extension{
    constructor(settings){
        this._settings = settings;
        this._osdManagerProto = OsdWindowManager.prototype;
        this._monitorsChangedOrig = this._osdManagerProto._monitorsChanged;
    }

    enable(){
        const { _monitorsChangedOrig, _settings } = this;
        this._osdManagerProto._monitorsChanged = function () {
            for (let i = 0; i < Main.layoutManager.monitors.length; i++)
                if (this._osdWindows[i] == undefined)
                this._osdWindows[i] = new OsdWidget(_settings, i);

            for (let i = Main.layoutManager.monitors.length; i < this._osdWindows.length; i++) {
                this._osdWindows[i].destroy();
                this._osdWindows[i] = null;
            }

            this._osdWindows.length = Main.layoutManager.monitors.length;
        };
        Main.osdWindowManager._osdWindows.forEach(w => w.destroy);
        Main.osdWindowManager._osdWindows = [];
        Main.osdWindowManager._monitorsChanged();
    }

    disable(){
        this._osdManagerProto._monitorsChanged = this._monitorsChangedOrig;
        Main.osdWindowManager._osdWindows.forEach(w => w.destroy);
        Main.osdWindowManager._osdWindows = [];
        Main.osdWindowManager._monitorsChanged();
    }
}
