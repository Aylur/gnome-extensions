'use strict';

const { GObject, St, Clutter, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Calendar = imports.ui.calendar;

const Indicator = GObject.registerClass(
class Indicator extends St.BoxLayout{
    _init(settings){
        super._init();

        this.settings = settings;
        this.settings.connect('changed::notification-indicator-hide-counter', () => {
            if(this.settings.get_boolean('notification-indicator-hide-counter'))
                this.counter.hide();
            else this.counter.show();
        });

        this.icon = new St.Icon({ style_class: 'system-status-icon' });
        this.counter = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
        this.add_child(this.icon);
        this.add_child(this.counter);

        this.list = Main.panel.statusArea.dateMenu._messageList._notificationSection;
        this.list._list.connectObject(
            'actor-added', () => this._syncCounter(),
            'actor-removed', () => this._syncCounter(),
            this
        );

        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });
        this._settings.connect('changed::show-banners', () => this._syncIcon());
        
        this.settingsBind = this.settings.connect(
            'changed::notification-indicator-hide-on-zero', () => this._syncCounter()
        );
        this._syncIcon();
        this._syncCounter();

        this.connect('destroy', () => {
            this.list._list.disconnectObject(this);
            this.settings.disconnect(this.settingsBind);
        });
    }

    _syncIcon(){
        if(this._settings.get_boolean('show-banners')){
            this.icon.icon_name = 'org.gnome.Settings-notifications-symbolic';
            if(!this.settings.get_boolean('notification-indicator-hide-counter'))
                this.counter.show();
        }else{
            this.icon.icon_name = 'notifications-disabled-symbolic';
            this.counter.hide();
        }
    }

    _syncCounter(){
        let count = this.list._messages.length;
        this.counter.text = `${count}`;

        if(this.settings.get_boolean('notification-indicator-hide-counter'))
            this.counter.hide();
        else this.counter.show();

        this.show();

        if(this.settings.get_boolean('notification-indicator-hide-on-zero')){
            if(count === 0) this.hide();
        }
    }
});

const PanelButton = GObject.registerClass(
class PanelButton extends PanelMenu.Button{
    _init(settings){
        super._init(0.5, 'Notifications', false);

        this.add_style_class_name('notification-indicator');
        this.indicator = new Indicator(settings);
        this.add_child(this.indicator);

        this.bind_property('visible',
            this.indicator, 'visible',
        GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL);

        this.indicator._syncCounter();

        //UI
        let datemenu = new imports.ui.dateMenu.DateMenuButton();
        this.notificationList = datemenu._messageList._notificationSection;

        this.clearBtn = datemenu._messageList._clearButton;
        this.clearBtn.get_parent().remove_child(this.clearBtn);

        this.list = datemenu._messageList._scrollView;
        this.list.get_parent().remove_child(this.list);
        this.list.add_style_class_name('list');

        this.mediaSection = datemenu._messageList._mediaSection;
        this.mediaSection.get_parent().remove_child(this.mediaSection);

        let hbox = new St.BoxLayout({ style_class: 'header-box' });
        hbox.add_child(new St.Label({ text: _('Notifications'), y_align: Clutter.ActorAlign.CENTER }));
        hbox.add_child(this.clearBtn)

        this.menu.box.add_child(hbox);
        this.menu.box.add_child(this.list);
        this.menu.box.add_style_class_name('notifications');

        //sync notifications
        let stockNotifications = Main.panel.statusArea.dateMenu._messageList._notificationSection;
        let notifications = stockNotifications._messages;
        notifications.forEach(n => {
            let notification = new Calendar.NotificationMessage(n.notification);
            this.notificationList.addMessage(notification);
        });

        this.menu.box.width = settings.get_int('notification-indicator-menu-width');
        let bind = settings.connect('changed::notification-indicator-menu-width',
            () => this.menu.box.width = settings.get_int('notification-indicator-menu-width'));

        this.connect('destroy', () => settings.disconnect(bind));

        let maxHeight = Main.layoutManager.primaryMonitor.height - Main.panel.height -20;
        this.menu.box.style = `max-height: ${maxHeight}px;`;
    }
});

var Extension = class Extension{
    constructor(){
        this.pos = [
            'left',
            'center',
            'right'
        ];
        this.panelBox = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox
        ]
    }

    enable(){
        this.settings = ExtensionUtils.getSettings();

        this.settings.connect('changed::notification-indicator-position', () => this.reload());
        this.settings.connect('changed::notification-indicator-offset', () => this.reload());
        this.reload();
    }

    disable(){
        this.settings = null;
        this.indicator.destroy();
        this.indicator = null;
    }

    reload(){
        if(this.indicator){
            this.indicator.destroy();
            this.indicator = null;
        }

        let position = this.settings.get_int('notification-indicator-position');
        let offset = this.settings.get_int('notification-indicator-offset');

        if(position === 3){
            this.indicator = new Indicator(this.settings);

            if(Main.panel.statusArea.quickSettings)
                Main.panel.statusArea.quickSettings._indicators.insert_child_at_index(this.indicator, offset);
    
            if(Main.panel.statusArea.aggregateMenu)
                Main.panel.statusArea.aggregateMenu._indicators.insert_child_at_index(this.indicator, offset);
        }else{
            this.indicator = new PanelButton(this.settings);
            Main.panel.addToStatusArea('Notifications', this.indicator, offset, this.pos[position]);
        }
    }
}