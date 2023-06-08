/* exported Extension */

const {Meta} = imports.gi;
const Util = imports.misc.util;

class Window {
    constructor(window) {
        this.window = window;
    }

    get xid() {
        const desc  = this.window.get_description();
        const match = desc && desc.match(/0x[0-9a-f]+/);

        return match && match[0];
    }

    hideHeaderBar() {
        if (this.window.get_frame_type() === Meta.FrameType.BORDER)
            return;
        if (!this.window.decorated)
            return;
        Util.spawn(['xprop', '-id', this.xid,
            '-f', '_MOTIF_WM_HINTS',
            '32c',
            '-set', '_MOTIF_WM_HINTS',
            // '0x2, 0x0, 0x2, 0x0, 0x0'
            '2']);
    }

    showHeaderBar() {
        if (!this.window.decorated)
            return;
        Util.spawn(['xprop', '-id', this.xid,
            '-f', '_MOTIF_WM_HINTS',
            '32c',
            '-set', '_MOTIF_WM_HINTS',
            '0x2, 0x0, 0x1, 0x0, 0x0']);
    }
}

var Extension = class Extension {
    enable() {
        this._windows = new Map();

        for (const window of global.get_window_actors())
            this._onWindowAdded(null, window);

        global.window_group.connectObject(
            'actor-added', this._onWindowAdded.bind(this),
            'actor-removed', this._onWindowRemoved.bind(this),
            this
        );
    }

    disable() {
        global.window_group.disconnectObject(this);
        for (const [_xid, window] of this._windows)
            window.showHeaderBar();

        this._windows = null;
    }

    _onWindowAdded(_container, window) {
        if (!window.meta_window)
            return;
        const win = new Window(window.meta_window);
        if (this._windows.get(win.xid))
            return;

        this._windows.set(win.xid, win);
        win.hideHeaderBar();
    }

    _onWindowRemoved(_container, window) {
        if (!window.meta_window)
            return;
        const win = new Window(window.meta_window);
        this._windows.delete(win.xid);
    }
};
