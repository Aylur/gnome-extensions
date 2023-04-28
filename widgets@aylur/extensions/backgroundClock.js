const { Clutter, GObject, GLib, St, Meta, GnomeDesktop } = imports.gi;
const Background = imports.ui.background;
const Main = imports.ui.main;

const ClockWidget = GObject.registerClass(
class ClockWidget extends St.BoxLayout{
    _init(settings){
        super._init({
            style_class: 'background-clock',
            vertical: true,
            x_expand: true,
            y_expand: true,
        });

        this.scaling = 1;

        this._clock = new St.Label({ x_expand: true });
        this._date = new St.Label({ x_expand: true });

        this._settings = settings;
        this._settings.connectObject(
            'changed::background-clock-position', this._settingsChanged.bind(this),
            'changed::background-clock-x-offset', this._settingsChanged.bind(this),
            'changed::background-clock-y-offset', this._settingsChanged.bind(this),

            'changed::background-clock-enable-clock',       this._settingsChanged.bind(this),
            'changed::background-clock-clock-format',       this._settingsChanged.bind(this),
            'changed::background-clock-clock-size',         this._settingsChanged.bind(this),
            'changed::background-clock-clock-custom-font',  this._settingsChanged.bind(this),
            'changed::background-clock-clock-font',         this._settingsChanged.bind(this),
            'changed::background-clock-clock-color',        this._settingsChanged.bind(this),
            'changed::background-clock-clock-shadow-x',     this._settingsChanged.bind(this),
            'changed::background-clock-clock-shadow-y',     this._settingsChanged.bind(this),
            'changed::background-clock-clock-shadow-blur',  this._settingsChanged.bind(this),
            'changed::background-clock-clock-shadow-width', this._settingsChanged.bind(this),
            'changed::background-clock-clock-shadow-color', this._settingsChanged.bind(this),

            'changed::background-clock-enable-date',        this._settingsChanged.bind(this),
            'changed::background-clock-date-format',        this._settingsChanged.bind(this),
            'changed::background-clock-date-size',          this._settingsChanged.bind(this),
            'changed::background-clock-date-custom-font',   this._settingsChanged.bind(this),
            'changed::background-clock-date-font',          this._settingsChanged.bind(this),
            'changed::background-clock-date-color',         this._settingsChanged.bind(this),
            'changed::background-clock-date-shadow-x',      this._settingsChanged.bind(this),
            'changed::background-clock-date-shadow-y',      this._settingsChanged.bind(this),
            'changed::background-clock-date-shadow-blur',   this._settingsChanged.bind(this),
            'changed::background-clock-date-shadow-width',  this._settingsChanged.bind(this),
            'changed::background-clock-date-shadow-color',  this._settingsChanged.bind(this),

            'changed::background-clock-bg-color',           this._settingsChanged.bind(this),
            'changed::background-clock-bg-padding',         this._settingsChanged.bind(this),
            'changed::background-clock-bg-border-size',     this._settingsChanged.bind(this),
            'changed::background-clock-bg-border-radius',   this._settingsChanged.bind(this),
            'changed::background-clock-bg-border-color',    this._settingsChanged.bind(this),
            'changed::background-clock-bg-shadow-inset',    this._settingsChanged.bind(this),
            'changed::background-clock-bg-shadow-x',        this._settingsChanged.bind(this),
            'changed::background-clock-bg-shadow-y',        this._settingsChanged.bind(this),
            'changed::background-clock-bg-shadow-blur',     this._settingsChanged.bind(this),
            'changed::background-clock-bg-shadow-width',    this._settingsChanged.bind(this),
            'changed::background-clock-bg-shadow-color',    this._settingsChanged.bind(this),
            this
        );
        this._settingsChanged();

        this._wallclock = new GnomeDesktop.WallClock({ time_only: true });
        this._wallclock.connectObject(
            'notify::clock',
            () => this._updateClock(), this);
        
        this.connect('destroy', this._onDestroy.bind(this));
    }

    scale(s){
        this.scaling = s;
        this._updateClock();
        this._updateStyle();
    }

    _settingsChanged(){
        this.remove_all_children();
        if(this._settings.get_boolean('background-clock-enable-clock'))
            this.add_child(this._clock);

        if(this._settings.get_boolean('background-clock-enable-date'))
            this.add_child(this._date);

        let y = {
            top: Clutter.ActorAlign.START,
            middle: Clutter.ActorAlign.CENTER,
            bottom: Clutter.ActorAlign.END
        }
        let x = {
            left: Clutter.ActorAlign.START,
            center: Clutter.ActorAlign.CENTER,
            right: Clutter.ActorAlign.END
        }
        switch (this._settings.get_int('background-clock-position')) {
            case 0: this.y_align = y['top'];    this.x_align = x['left'];   break;
            case 1: this.y_align = y['top'];    this.x_align = x['center']; break;
            case 2: this.y_align = y['top'];    this.x_align = x['right'];  break;
            case 3: this.y_align = y['middle']; this.x_align = x['left'];   break;
            case 4: this.y_align = y['middle']; this.x_align = x['center']; break;
            case 5: this.y_align = y['middle']; this.x_align = x['right'];  break;
            case 6: this.y_align = y['bottom']; this.x_align = x['left'];   break;
            case 7: this.y_align = y['bottom']; this.x_align = x['center']; break;
            case 8: this.y_align = y['bottom']; this.x_align = x['right'];  break;
            default: this.y_align = y['bottom']; this.x_align = x['right'];  break;
        }
        this._clock.x_align = this.x_align;
        this._date.x_align = this.x_align;

        this._clockFormat = this._settings.get_string('background-clock-clock-format');
        this._dateFormat = this._settings.get_string('background-clock-date-format');

        this._updateClock();
        this._updateStyle();
    }

    _updateStyle(){
        this.style = `
            background-color: ${this._settings.get_string('background-clock-bg-color')};
            border: ${this._settings.get_int('background-clock-bg-border-size') * this.scaling}px
                    solid
                    ${this._settings.get_string('background-clock-bg-border-color')};
            border-radius: ${this._settings.get_int('background-clock-bg-border-radius') * this.scaling}px;
            box-shadow: ${this._settings.get_boolean('background-clock-bg-shadow-inset') ? 'inset' : ''}
                        ${this._settings.get_int('background-clock-bg-shadow-x') * this.scaling}px
                        ${this._settings.get_int('background-clock-bg-shadow-y') * this.scaling}px
                        ${this._settings.get_int('background-clock-bg-shadow-blur') * this.scaling}px
                        ${this._settings.get_int('background-clock-bg-shadow-width') * this.scaling}px
                        ${this._settings.get_string('background-clock-bg-shadow-color')};
            padding: ${this._settings.get_int('background-clock-bg-padding') * this.scaling}px;
            margin-left: ${this._settings.get_int('background-clock-x-offset') * this.scaling}px;
            margin-right: ${this._settings.get_int('background-clock-x-offset') * this.scaling}px;
            margin-top: ${this._settings.get_int('background-clock-y-offset') * this.scaling}px;
            margin-bottom: ${this._settings.get_int('background-clock-y-offset') * this.scaling}px;
        `;

        this._clock.style = `
            font-size: ${this._settings.get_int('background-clock-clock-size') * this.scaling}pt;
            color: ${this._settings.get_string('background-clock-clock-color')};
            text-shadow:${this._settings.get_int('background-clock-clock-shadow-x') * this.scaling}px
                        ${this._settings.get_int('background-clock-clock-shadow-y') * this.scaling}px
                        ${this._settings.get_int('background-clock-clock-shadow-blur') * this.scaling}px
                        ${this._settings.get_int('background-clock-clock-shadow-width') * this.scaling}px
                        ${this._settings.get_string('background-clock-clock-shadow-color')};
        `;
        if(this._settings.get_boolean('background-clock-clock-custom-font'))
            this._clock.style += `font-family: ${this._settings.get_string('background-clock-clock-font')};`;

        this._date.style = `
            font-size: ${this._settings.get_int('background-clock-date-size') * this.scaling}pt;
            color: ${this._settings.get_string('background-clock-date-color')};
            text-shadow:${this._settings.get_int('background-clock-date-shadow-x') * this.scaling}px
                        ${this._settings.get_int('background-clock-date-shadow-y') * this.scaling}px
                        ${this._settings.get_int('background-clock-date-shadow-blur') * this.scaling}px
                        ${this._settings.get_int('background-clock-date-shadow-width') * this.scaling}px
                        ${this._settings.get_string('background-clock-date-shadow-color')};
        `;
        if(this._settings.get_boolean('background-clock-date-custom-font'))
            this._date.style += `font-family: ${this._settings.get_string('background-clock-date-font')};`;
    }

    _updateClock(){
        let clock = GLib.DateTime.new_now_local().format(this._clockFormat);
        let date = GLib.DateTime.new_now_local().format(this._dateFormat);

        this._clock.set_text(clock);
        this._date.set_text(date);
    }

    _onDestroy() {
        this._wallclock.disconnectObject(this);
        this._wallclock.run_dispose();
        this._wallclock = null;
        this._settings.disconnectObject(this);
    }
})

const BackgroundClock = GObject.registerClass(
class BackgroundClock extends St.Widget {
    _init(backgroundActor, settings) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            x_expand: true,
            y_expand: true,
        });

        this._clockWidget = new ClockWidget(settings);
        this.add_actor(this._clockWidget);

        this._backgroundActor = backgroundActor;
        this._monitorIndex = this._backgroundActor.monitor;

        this._backgroundActor.layout_manager = new Clutter.BinLayout();
        this._backgroundActor.add_child(this);

        this.connect('destroy', this._onDestroy.bind(this));
    }

    _updateScale() {
        if (!this.has_allocation())
            return;

        let { width } = Main.layoutManager.getWorkAreaForMonitor(this._monitorIndex);        
        let maxWidth = this.allocation.get_width();
        let scale = maxWidth / width;

        this._clockWidget.scale(scale);
    }

    vfunc_allocate(box) {
        super.vfunc_allocate(box);

        if (this._laterId)
            return;

        const laters = global.compositor.get_laters();
        this._laterId = laters.add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._updateScale();

            this._laterId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    _onDestroy() {
        if (this._laterId)
            global.compositor.get_laters().remove(this._laterId);
        this._laterId = 0;

        this._backgroundActor.layout_manager = null;
    }
});

var Extension = class Extension {
    constructor(settings) {
        this._settings = settings ;
        this._bgManagerProto = Background.BackgroundManager.prototype;
        this._createBackgroundOrig = this._bgManagerProto._createBackgroundActor;
    }

    enable() {
        const { _createBackgroundOrig, _settings } = this;
        this._bgManagerProto._createBackgroundActor = function () {
            const backgroundActor = _createBackgroundOrig.call(this);
            new BackgroundClock(backgroundActor, _settings);

            return backgroundActor;
        };
        Main.layoutManager._updateBackgrounds();
    }

    disable() {
        this._bgManagerProto._createBackgroundActor = this._createBackgroundOrig;
        Main.layoutManager._updateBackgrounds();
    }
}

function init() {
    return new Extension();
}
