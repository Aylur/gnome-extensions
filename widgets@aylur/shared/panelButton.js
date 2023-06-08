/* exported PanelButton */

const Main = imports.ui.main;

var PanelButton = class PanelButton {
    constructor({settings, indicator, signals, name}) {
        this._settings = settings;
        this._indicator = indicator;
        this._signals = signals;
        this._name = name;
        this._pos = [
            'left',
            'center',
            'right',
        ];
    }

    enable() {
        const arr = [];
        this._signals.forEach(s =>
            arr.push(`changed::${s}`, this._reload.bind(this))
        );
        this._settings.connectObject(...arr, this);
        this._reload();
    }

    disable() {
        this._panelButton.destroy();
        this._panelButton = null;
        this._settings.disconnectObject(this);
    }

    _reload() {
        if (this._panelButton) {
            this._panelButton.destroy();
            this._panelButton = null;
        }

        this._panelButton = new this._indicator(this._settings);
        const pos    = this._settings.get_int(`${this._name}-position`);
        const offset = this._settings.get_int(`${this._name}-offset`);
        Main.panel.addToStatusArea(this._name, this._panelButton, offset, this._pos[pos]);
    }
};
