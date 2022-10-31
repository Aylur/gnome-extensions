/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
const { Clutter, GObject, GLib, St, Meta, GnomeDesktop } = imports.gi;

const Background = imports.ui.background;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

const ClockWidget = GObject.registerClass(
class ClockWidget extends St.BoxLayout{
    _init(){
        super._init({
            style_class: 'background-clock',
            vertical: true,
            x_expand: true,
            y_expand: true,
        });

        this.scaling = 1;

        this._clock = new St.Label({ x_expand: true });
        this._date = new St.Label({ x_expand: true });
        this._clock.clutter_text.use_markup = true;
        this._date.clutter_text.use_markup = true;

        this._settings = ExtensionUtils.getSettings();
        this._settings.connect('changed::background-clock-position', this._settingsChanged.bind(this));
        this._settings.connect('changed::background-clock-offset', this._settingsChanged.bind(this));
        this._settings.connect('changed::background-clock-clock-size', this._settingsChanged.bind(this));
        this._settings.connect('changed::background-clock-date-size', this._settingsChanged.bind(this));
        this._settings.connect('changed::background-clock-clock-format', this._settingsChanged.bind(this));
        this._settings.connect('changed::background-clock-date-format', this._settingsChanged.bind(this));
        this._settings.connect('changed::background-clock-color', this._settingsChanged.bind(this));
        this._settings.connect('changed::background-clock-other-css', this._settingsChanged.bind(this));
        this._settingsChanged();


        this.add_child(this._clock);
        this.add_child(this._date);

        this._wallclock = new GnomeDesktop.WallClock();
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
        let offset = this._settings.get_int('background-clock-offset');
        let color = this._settings.get_string('background-clock-color');
        let css = this._settings.get_string('background-clock-other-css');

        this.style = `
            margin: ${offset * this.scaling}px;
            color: ${color};
            ${css}`;
    }

    _updateClock(){
        let clock = GLib.DateTime.new_now_local().format(this._clockFormat);
        let date = GLib.DateTime.new_now_local().format(this._dateFormat);

        let clockSize = this._settings.get_int('background-clock-clock-size') * this.scaling;
        let dateSize = this._settings.get_int('background-clock-date-size') * this.scaling;

        this._clock.clutter_text.text = `<span size="${clockSize}pt" >${clock}</span>`;
        this._date.clutter_text.text = `<span size="${dateSize}pt" >${date}</span>`;
    }

    _onDestroy() {
        this._wallclock.disconnectObject(this);
        this._wallclock = null;
        this._settings.run_dispose();
        this._settings = null;
    }
})

const BackgroundClock = GObject.registerClass(
class BackgroundClock extends St.Widget {
    _init(backgroundActor) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            x_expand: true,
            y_expand: true,
        });

        this._clockWidget = new ClockWidget();
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

        this._laterId = Meta.later_add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._updateScale();

            this._laterId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    _onDestroy() {
        if (this._laterId)
            Meta.later_remove(this._laterId);
        this._laterId = 0;

        this._backgroundActor.layout_manager = null;
    }
});

var Extension = class Extension {
    constructor() {
        this._bgManagerProto = Background.BackgroundManager.prototype;
        this._createBackgroundOrig = this._bgManagerProto._createBackgroundActor;
    }

    enable() {
        const { _createBackgroundOrig } = this;
        this._bgManagerProto._createBackgroundActor = function () {
            const backgroundActor = _createBackgroundOrig.call(this);
            const logo_ = new BackgroundClock(backgroundActor);

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
