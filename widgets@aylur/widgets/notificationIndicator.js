'use strict';

const { GObject, St, Clutter, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Calendar = imports.ui.calendar;
const { NotificationList } = Me.imports.shared.notificationList;

const Indicator = GObject.registerClass(
class Indicator extends St.BoxLayout{
    _init(settings){
        super._init();

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

        this._bannerSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });
        let bind = this._bannerSettings.connect('changed::show-banners', () => this._syncIcon());
        
        this.settings = settings;
        this.settings.connectObject(
            'changed::notification-indicator-hide-counter', () => this._syncIndicatorVisibility(),
            'changed::notification-indicator-hide-on-zero', () => this._syncCounter(),
            this
        );
        this._syncIcon();
        this._syncCounter();

        this.connect('destroy', () => {
            this.list._list.disconnectObject(this);
            this.settings.disconnectObject(this);
            this._bannerSettings.disconnect(bind);
            this._bannerSettings = null;
        });
    }

    _syncIndicatorVisibility(){
        this.counter.visible = !this.settings.get_boolean('notification-indicator-hide-counter');
    }

    _syncIcon(){
        if(this._bannerSettings.get_boolean('show-banners')){
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
        this.list = new NotificationList(settings.get_boolean('notification-indicator-show-dnd'));
        this.menu.box.add_child(this.list);
        settings.connect('changed::notification-indicator-show-dnd', () => {
            this.list.destroy();
            this.list = new NotificationList(settings.get_boolean('notification-indicator-show-dnd'));
            this.menu.box.add_child(this.list);
        })
        
        this.menu.box.width = settings.get_int('notification-indicator-menu-width');
        settings.connect('changed::notification-indicator-menu-width', () =>
            this.menu.box.width = settings.get_int('notification-indicator-menu-width'));

        let maxHeight = Main.layoutManager.primaryMonitor.height - Main.panel.height;
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