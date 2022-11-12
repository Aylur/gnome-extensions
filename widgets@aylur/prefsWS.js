//https://gitlab.gnome.org/GNOME/gnome-shell-extensions/-/tree/main/extensions/workspace-indicator
const {Adw, Gio, GLib, GObject, Gtk, Pango} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;

const WORKSPACE_SCHEMA = 'org.gnome.desktop.wm.preferences';
const WORKSPACE_KEY = 'workspace-names';

class NewItem extends GObject.Object {}
GObject.registerClass(NewItem);

class NewItemModel extends GObject.Object {
    static [GObject.interfaces] = [Gio.ListModel];
    static {
        GObject.registerClass(this);
    }

    #item = new NewItem();

    vfunc_get_item_type() {
        return NewItem;
    }

    vfunc_get_n_items() {
        return 1;
    }

    vfunc_get_item(_pos) {
        return this.#item;
    }
}

class WorkspacesList extends GObject.Object {
    static [GObject.interfaces] = [Gio.ListModel];
    static {
        GObject.registerClass(this);
    }

    #settings = new Gio.Settings({schema_id: WORKSPACE_SCHEMA});
    #names = this.#settings.get_strv(WORKSPACE_KEY);
    #items = Gtk.StringList.new(this.#names);
    #changedId;

    constructor() {
        super();

        this.#changedId =
            this.#settings.connect(`changed::${WORKSPACE_KEY}`, () => {
                const removed = this.#names.length;
                this.#names = this.#settings.get_strv(WORKSPACE_KEY);
                this.#items.splice(0, removed, this.#names);
                this.items_changed(0, removed, this.#names.length);
            });
    }

    append() {
        const name = 'Workspace %d'.format(this.#names.length + 1);

        this.#names.push(name);
        this.#settings.block_signal_handler(this.#changedId);
        this.#settings.set_strv(WORKSPACE_KEY, this.#names);
        this.#settings.unblock_signal_handler(this.#changedId);

        const pos = this.#items.get_n_items();
        this.#items.append(name);
        this.items_changed(pos, 0, 1);
    }

    remove(name) {
        const pos = this.#names.indexOf(name);
        if (pos < 0)
            return;

        this.#names.splice(pos, 1);

        this.#settings.block_signal_handler(this.#changedId);
        this.#settings.set_strv(WORKSPACE_KEY, this.#names);
        this.#settings.unblock_signal_handler(this.#changedId);

        this.#items.remove(pos);
        this.items_changed(pos, 1, 0);
    }

    rename(oldName, newName) {
        const pos = this.#names.indexOf(oldName);
        if (pos < 0)
            return;

        this.#names.splice(pos, 1, newName);
        this.#items.splice(pos, 1, [newName]);

        this.#settings.block_signal_handler(this.#changedId);
        this.#settings.set_strv(WORKSPACE_KEY, this.#names);
        this.#settings.unblock_signal_handler(this.#changedId);
    }

    vfunc_get_item_type() {
        return Gtk.StringObject;
    }

    vfunc_get_n_items() {
        return this.#items.get_n_items();
    }

    vfunc_get_item(pos) {
        return this.#items.get_item(pos);
    }
}

var wsNamesGroup = class WorkspaceSettingsWidget extends Adw.PreferencesGroup {
    static {
        GObject.registerClass(this);

        this.install_action('workspaces.add', null,
            self => self._workspaces.append());
        this.install_action('workspaces.remove', 's',
            (self, name, param) => self._workspaces.remove(param.unpack()));
        this.install_action('workspaces.rename', '(ss)',
            (self, name, param) => self._workspaces.rename(...param.deepUnpack()));
    }

    constructor() {
        super({
            title: 'Workspace Names',
        });

        this._workspaces = new WorkspacesList();

        const store = new Gio.ListStore({item_type: Gio.ListModel});
        const listModel = new Gtk.FlattenListModel({model: store});
        store.append(this._workspaces);
        store.append(new NewItemModel());

        this._list = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });
        this._list.connect('row-activated', (l, row) => row.edit());
        this.add(this._list);

        this._list.bind_model(listModel, item => {
            return item instanceof NewItem
                ? new NewWorkspaceRow()
                : new WorkspaceRow(item.string);
        });
    }
}

class WorkspaceRow extends Adw.PreferencesRow {
    static {
        GObject.registerClass(this);
    }

    constructor(name) {
        super({name});

        const box = new Gtk.Box({
            spacing: 12,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 6,
            margin_end: 6,
        });

        const label = new Gtk.Label({
            hexpand: true,
            xalign: 0,
            max_width_chars: 25,
            ellipsize: Pango.EllipsizeMode.END,
        });
        this.bind_property('name', label, 'label',
            GObject.BindingFlags.SYNC_CREATE);
        box.append(label);

        const button = new Gtk.Button({
            action_name: 'workspaces.remove',
            icon_name: 'edit-delete-symbolic',
            has_frame: false,
        });
        box.append(button);

        this.bind_property_full('name',
            button, 'action-target',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, target) => [true, new GLib.Variant('s', target)],
            null);

        this._entry = new Gtk.Entry({
            max_width_chars: 25,
        });

        const controller = new Gtk.ShortcutController();
        controller.add_shortcut(new Gtk.Shortcut({
            trigger: Gtk.ShortcutTrigger.parse_string('Escape'),
            action: Gtk.CallbackAction.new(() => {
                this._stopEdit();
                return true;
            }),
        }));
        this._entry.add_controller(controller);

        this._stack = new Gtk.Stack();
        this._stack.add_named(box, 'display');
        this._stack.add_named(this._entry, 'edit');
        this.child = this._stack;

        this._entry.connect('activate', () => {
            this.activate_action('workspaces.rename',
                new GLib.Variant('(ss)', [this.name, this._entry.text]));
            this.name = this._entry.text;
            this._stopEdit();
        });
        this._entry.connect('notify::has-focus', () => {
            if (this._entry.has_focus)
                return;
            this._stopEdit();
        });
    }

    edit() {
        this._entry.text = this.name;
        this._entry.grab_focus();
        this._stack.visible_child_name = 'edit';
    }

    _stopEdit() {
        this.grab_focus();
        this._stack.visible_child_name = 'display';
    }
}

class NewWorkspaceRow extends Adw.PreferencesRow {
    static {
        GObject.registerClass(this);
    }

    constructor() {
        super({
            action_name: 'workspaces.add',
            child: new Gtk.Image({
                icon_name: 'list-add-symbolic',
                pixel_size: 16,
                margin_top: 12,
                margin_bottom: 12,
                margin_start: 12,
                margin_end: 12,
            }),
        });
        this.update_property(
            [Gtk.AccessibleProperty.LABEL], ['Add Workspace']);
    }
}