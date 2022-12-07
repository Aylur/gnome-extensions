'use strict';

const { GObject, St, Clutter, Gio } = imports.gi;
const Main = imports.ui.main;
const Calendar = imports.ui.calendar;
const MessageList = imports.ui.messageList;
const MessageTray = imports.ui.messageTray;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;


const NotificationSection = GObject.registerClass(
class NotificationSection extends MessageList.MessageListSection {
    _init() {
        super._init();

        this._nUrgent = 0;

        Main.messageTray.connectObject('source-added', this._sourceAdded.bind(this), this);
        Main.messageTray.getSources().forEach(source => {
            this._sourceAdded(Main.messageTray, source);
        });
    }

    _destroy(){
        Main.sessionMode.disconnectObject(this);
        Main.messageTray.disconnectObject(this);
    }

    get allowed() {
        return Main.sessionMode.hasNotifications &&
               !Main.sessionMode.isGreeter;
    }

    _sourceAdded(tray, source) {
        source.connectObject('notification-added',
            this._onNotificationAdded.bind(this), this);
    }

    _onNotificationAdded(source, notification) {
        let message = new Calendar.NotificationMessage(notification);
        message.setSecondaryActor(new Calendar.TimeLabel(notification.datetime));

        let isUrgent = notification.urgency == MessageTray.Urgency.CRITICAL;

        notification.connectObject(
            'destroy', () => {
                if (isUrgent)
                    this._nUrgent--;
            },
            'updated', () => {
                message.setSecondaryActor(new Calendar.TimeLabel(notification.datetime));
                this.moveMessage(message, isUrgent ? 0 : this._nUrgent, this.mapped);
            }, this);

        if (isUrgent) {
            this._nUrgent++;
        } else if (this.mapped) {
            notification.acknowledged = true;
        }

        let index = isUrgent ? 0 : this._nUrgent;
        this.addMessageAtIndex(message, index, this.mapped);
    }

    vfunc_map() {
        this._messages.forEach(message => {
            if (message.notification.urgency != MessageTray.Urgency.CRITICAL)
                message.notification.acknowledged = true;
        });
        super.vfunc_map();
    }
});

const DoNotDisturbSwitch = GObject.registerClass(
class DoNotDisturbSwitch extends PopupMenu.Switch {
    _init() {
        this._settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.notifications',
        });

        super._init(this._settings.get_boolean('show-banners'));

        this._settings.bind('show-banners',
            this, 'state',
            Gio.SettingsBindFlags.INVERT_BOOLEAN);

        this.connect('destroy', () => {
            Gio.Settings.unbind(this, 'state');
            this._settings = null;
        });
    }
});
    
var NotificationList = GObject.registerClass(
class NotificationList extends St.BoxLayout {
    _init(dnd) {
        super._init({
            // style_class: 'message-list',
            x_expand: true,
            y_expand: true,
            vertical: true
        });

        let box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
        });
        this.add_child(box);

        this._placeholder = new Calendar.Placeholder();
        this._placeholder.x_align = Clutter.ActorAlign.CENTER;
        this._placeholder.add_style_class_name('notifications-placeholder');
        this.add_child(this._placeholder);

        let hbox = new St.BoxLayout({ style_class: 'message-list-controls' });
        box.add_child(hbox);
        this._controls = hbox;

        this._scrollView = new St.ScrollView({
            style_class: 'vfade',
            overlay_scrollbars: true,
            enable_mouse_scrolling: true,
            x_expand: true, y_expand: true,
        });
        this._scrollView.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);
        box.add_actor(this._scrollView);

        this.dnd = dnd;
        if(dnd){
            const dndLabel = new St.Label({
                text: _('Do Not Disturb'),
                y_align: Clutter.ActorAlign.CENTER,
            });
            hbox.add_child(dndLabel);
    
            this._dndSwitch = new DoNotDisturbSwitch();
            this._dndButton = new St.Button({
                style_class: 'dnd-button',
                can_focus: true,
                toggle_mode: true,
                child: this._dndSwitch,
                label_actor: dndLabel,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._dndSwitch.bind_property('state',
                this._dndButton, 'checked',
                GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE);
            hbox.add_child(this._dndButton);
        }
        else{
            hbox.add_child(new St.Label({
                text: 'Notifications',
                y_align: Clutter.ActorAlign.CENTER
            }));
        }

        this._clearButton = new St.Button({
            style_class: 'message-list-clear-button button',
            label: _('Clear'),
            can_focus: true,
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
        });
        this._clearButton.connect('clicked', () => {
            this._sectionList.get_children().forEach(s => s.clear());
        });
        hbox.add_actor(this._clearButton);

        this._placeholder.bind_property('visible',
            this._clearButton, 'visible',
            GObject.BindingFlags.INVERT_BOOLEAN);

        this._sectionList = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.START,
        });
        this._sectionList.connectObject(
            'actor-added', this._sync.bind(this),
            'actor-removed', this._sync.bind(this),
            this);
        this._scrollView.add_actor(this._sectionList);

        this._notificationSection = new NotificationSection();
        this._addSection(this._notificationSection);

        Main.sessionMode.connectObject('updated', this._sync.bind(this),this);
        this.connect('destroy', () => Main.sessionMode.disconnectObject(this));

        Main.panel.statusArea.dateMenu._messageList._notificationSection._messages
        .forEach(n => {
            let notification = new Calendar.NotificationMessage(n.notification);
            this._notificationSection.addMessage(notification);
        });
    }

    _addSection(section) {
        section.connectObject(
            'notify::visible', this._sync.bind(this),
            'notify::empty', this._sync.bind(this),
            'notify::can-clear', this._sync.bind(this),
            'destroy', () => this._sectionList.remove_actor(section),
            'message-focused', (_s, messageActor) => {
                Util.ensureActorVisibleInScrollView(this._scrollView, messageActor);
            }, this);
        this._sectionList.add_actor(section);
    }

    _sync() {
        let sections = this._sectionList.get_children();
        let visible = sections.some(s => s.allowed);
        this.visible = visible;
        if (!visible)
            return;

        let empty = sections.every(s => s.empty || !s.visible);
        this._placeholder.visible = empty;
        this._controls.visible = !empty || this.dnd;

        let canClear = sections.some(s => s.canClear && s.visible);
        this._clearButton.reactive = canClear;
    }
});
    