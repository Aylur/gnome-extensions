'use strict';

const { GObject, St, Clutter, Gio, GLib, Shell, GnomeDesktop, UPowerGlib: UPower } = imports.gi;
const Config = imports.misc.config;
const Main = imports.ui.main;
const SystemActions = imports.misc.systemActions;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Mainloop = imports.mainloop;
const Calendar = imports.ui.calendar;

const SystemLevels = Me.imports.systemLevels;
const MediaPlayer = Me.imports.mediaPlayer;

const Network = imports.ui.status.network;
const Bluetooth = imports.ui.status.bluetooth;
const NightLight = imports.ui.status.nightLight;
const DarkMode = imports.ui.status.darkMode;
const PowerProfiles = imports.ui.status.powerProfiles;

const Volume = imports.ui.status.volume;
const Brightness = imports.ui.status.brightness;
const System = imports.ui.status.system;
const { QuickSlider, QuickToggle } = imports.ui.quickSettings;

const { loadInterfaceXML } = imports.misc.fileUtils;
const DisplayDeviceInterface = loadInterfaceXML('org.freedesktop.UPower.Device');
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

const NIGHT_LIGHT_MAX = 4700;
const NIGHT_LIGHT_MIN = 1400;

const QuickSettingsSystem = GObject.registerClass(
class QuickSettingsSystem extends St.BoxLayout{
    _init(){
        super._init({ style_class: 'quick-toggles-system' });

        //userBtn
        let userBtn = this._addBtn('', 
            () =>  Shell.AppSystem.get_default().lookup_app('gnome-user-accounts-panel.desktop').activate()
        );
        userBtn.style_class = 'icon-button user-btn';
        userBtn.set_child(new St.Widget({
            y_expand: true,
            style_class: 'user-icon',
            style: 'background-image: url("/var/lib/AccountsService/icons/'+ GLib.get_user_name() +'"); background-size: cover;',
        }));

        this.greet = new St.Label();
        this._setGreet();
        
        let greetBox = new St.BoxLayout({ vertical: true, y_align: Clutter.ActorAlign.CENTER });
        greetBox.add_child(new St.Label({ text: GLib.get_user_name() }));
        greetBox.add_child(this.greet);

        //settings
        let settingsBtn = this._addBtn('org.gnome.Settings-symbolic',
            () => Shell.AppSystem.get_default().lookup_app('org.gnome.Settings.desktop').activate());

        //lock
        let lockBtn = this._addBtn('system-lock-screen-symbolic', 
            () => SystemActions.getDefault().activateAction('lock-screen'));

        //powerOff
        let powerOffBtn = this._addBtn('system-shutdown-symbolic',
            () => SystemActions.getDefault().activateAction('power-off'));

        this.add_child(userBtn);
        this.add_child(greetBox);
        this.add_child(new St.Widget({ x_expand: true }));
        this.add_child(settingsBtn);
        this.add_child(lockBtn);
        this.add_child(powerOffBtn);
    }
    _setGreet(){
        let time = new Date();
        let hour = time.getHours();

        let greet = "Good Evening!";
        if(hour > 6){ greet = "Good Morning!"; }
        if(hour > 12){greet = "Good Afternoon!";}
        if(hour > 18){greet = "Good Evening!";}

        this.greet.text = greet;
    }
    _addBtn(iconName, callback){
        let btn = new St.Button({
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'icon-button',
            child: new St.Icon({
                icon_name: iconName,
            }),

        })
        btn.connect('clicked', () => {
            callback();
            Main.overview.hide();
            Main.panel.closeQuickSettings();
        });
        return btn;
    }
});

const PowerButton = GObject.registerClass(
class PowerButton extends St.Button{
    _init() {
        super._init({ style_class: 'quick-power' });

        let box = new St.BoxLayout();
        this._icon = new St.Icon();
        this._label = new St.Label();
        box.add_child(this._icon);
        box.add_child(this._label);
        this.set_child(box);

        this._proxy = new PowerManagerProxy(
            Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org/freedesktop/UPower/devices/DisplayDevice',
            (proxy, error) => {
                if (error)
                    console.error(error.message);
                else
                    this._proxy.connect('g-properties-changed', () => this._sync());
                this._sync();
            }
        );

        this.connect('clicked', () => {
            Shell.AppSystem.get_default().lookup_app('gnome-power-panel.desktop').activate();
            Main.overview.hide();
            Main.panel.closeQuickSettings();
        });

        this.connect('destroy', () => this._proxy = null);
    }

    _sync() {
        this.visible = this._proxy.IsPresent;
        if (!this.visible)
            return;

        let chargingState = this._proxy.State === UPower.DeviceState.CHARGING
            ? '-charging' : '';
        let fillLevel = 10 * Math.floor(this._proxy.Percentage / 10);
        const charged =
            this._proxy.State === UPower.DeviceState.FULLY_CHARGED ||
            (this._proxy.State === UPower.DeviceState.CHARGING && fillLevel === 100);

        this._icon.icon_name = charged
            ? 'battery-level-100-charged-symbolic'
            : `battery-level-${fillLevel}${chargingState}-symbolic`;

        this._label.text = `${this._proxy.Percentage}%`;
    }
});

const QuickTogglesBottom = GObject.registerClass(
class QuickTogglesBottom extends St.BoxLayout{
    _init(){
        super._init({ style_class: 'quick-toggles-bottom' });

        //clock
        this.clock = new St.Label({
            text: GLib.DateTime.new_now_local().format('%A | %Y. %m. %d. | %H:%M'),
        });
        this.wallClock = new GnomeDesktop.WallClock();
        this.binding = this.wallClock.connect('notify::clock', () =>{
            this.clock.text = GLib.DateTime.new_now_local().format('%A | %Y. %m. %d. | %H:%M');
        });

        this.add_child(new PowerButton());
        this.add_child(new St.Widget({ x_expand: true }));
        this.add_child(this.clock);

        this.connect('destroy', () => {
            this.wallClock.disconnect(this.binding);
            this.wallClock = null;
        });
    }
});

const SystemActionsBox = GObject.registerClass(
class SystemActionsBox extends St.BoxLayout{
    _init(){
        super._init({ style_class: 'system-actions container' });

        this._addBtn('org.gnome.Settings-symbolic',
            () => Shell.AppSystem.get_default().lookup_app('org.gnome.Settings.desktop').activate());

        this._addBtn('system-lock-screen-symbolic', 
            () => SystemActions.getDefault().activateAction('lock-screen'));

        this._addBtn('system-log-out-symbolic',
            () => SystemActions.getDefault().activateAction('logout'));

        this._addBtn('system-shutdown-symbolic',
            () => SystemActions.getDefault().activateAction('power-off'));
    }
    _addBtn(iconName, callback){
        let btn = new St.Button({
            style_class: 'button ',
            x_expand: true,
            child: new St.Icon({
                icon_name: iconName
            })
        });
        btn.connect('clicked', () => {
            callback();
            Main.overview.hide();
            Main.panel.closeQuickSettings();
        });
        this.add_child(btn);
    }
});

const NightLightSlider = GObject.registerClass(
class NightLightSlider extends QuickSlider {
    _init() {
        super._init({ iconName: 'night-light-symbolic' });        
        this._settings = new Gio.Settings({ schema_id: 'org.gnome.settings-daemon.plugins.color' });
        this._settings.connect('changed::night-light-enabled', () => this._sync());
        this._settings.connect('changed::night-light-temperature', () => this._settingsChanged());

        this.slider.connect('notify::value', () => this._sliderChanged());
        this._sync();
    }
    _sliderChanged(){
        let value = (1 - this.slider.value) * (NIGHT_LIGHT_MAX - NIGHT_LIGHT_MIN);
        value += NIGHT_LIGHT_MIN;
        this._settings.set_uint('night-light-temperature', value);
    }
    _settingsChanged(){
        let value = this._settings.get_uint('night-light-temperature');
        value -= NIGHT_LIGHT_MIN;
        value /= (NIGHT_LIGHT_MAX - NIGHT_LIGHT_MIN);
        this.slider.value = (1 - value);
    }
    _sync() {
        this._settings.get_boolean('night-light-enabled')?
            this.show() : this.hide();
    }
});
    

const SliderBox = GObject.registerClass(
class SliderBox extends St.BoxLayout{
    _init(){
        super._init({
            vertical: true,
            reactive: true,
            style_class: 'quick-slider-box'
        });

        this.volume = new Volume.Indicator();
        this.output = this.volume._output;
        this.input = this.volume._input;
        this.brightness = new Brightness.Indicator();

        this.add_child(this.output);
        this.add_child(this.output.menu.actor);
        this.add_child(this.input);
        this.add_child(this.input.menu.actor);
        this.add_child(this.brightness.quickSettingsItems[0]);
        this.add_child(new NightLightSlider());

        this.connect('destroy', () => {
            this.volume = null;
            this.output = null;
            this.input = null;
            this.brightness = null;
        });
    }
});

const MediaBox = GObject.registerClass(
class MediaBox extends St.Bin{
    _init(){
        super._init({ reactive: true, });

        this.media = new MediaPlayer.Media();
        this.media.connect('updated', () => this._sync());
        this._sync();

        this.connect('destroy', () => {
            this.media.destroy();
            this.media = null;
        });
    }

    _sync(){
        let mpris = this.media.getPlayer();
        if(mpris){
            this.player = new MediaPlayer.Player(mpris);
            this._buildPlayerUI();
            this.set_child(this.player);

            this.show();
        }else{
            this.hide();
        }
    }

    _buildPlayerUI(){
        let elements = this.player;
        this.player.style_class = 'media-container';
        let vbox = new St.BoxLayout({
            vertical: true,
            style_class: 'media-container',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true
        });
        vbox.add_child(elements.titleBox);
        vbox.add_child(elements.controlsBox);
        vbox.add_child(elements.volumeBox);
        this.player.add_child(elements.mediaCover);
        this.player.add_child(vbox);
    }
});

const DoNotDisturbToggle = GObject.registerClass(
class DoNotDisturbToggle extends QuickToggle{
    _init(){
        super._init();

        this._settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.notifications',
        });
        this._settings.connect('changed::show-banners',
            () => this.sync());
 
        this.connectObject(
            'destroy', () => this._settings.run_dispose(),
            'clicked', () => this.toggle(),
            this);

        this.sync();
    }
    toggle() {
        let enabled = this._settings.get_boolean('show-banners');
        this._settings.set_boolean('show-banners', !enabled);
        this.sync();
    }
    sync(){
        let enabled = this._settings.get_boolean('show-banners');
        if(enabled){
            this._icon.icon_name = 'org.gnome.Settings-notifications-symbolic';
            this._label.text = 'Noisy';
            this.checked = false;
        }else{
            this._icon.icon_name = 'notifications-disabled-symbolic';
            this._label.text = 'Silent';
            this.checked = true;
        }
    }
});

const LevelsBox = GObject.registerClass(
class LevelsBox extends St.BoxLayout{
    _init(){
        super._init({
            style_class: 'levels-container button',
            reactive: true
        });

        this.levels = [
            new SystemLevels.CpuLevel(true),
            new SystemLevels.RamLevel(true),
            new SystemLevels.TempLevel(true),
        ];

        this.levels.forEach(s => {
            this.add_child(s);
        });

        this.connect('destroy', () => this.stopTimeout());
    }
    startTimeout(){
        this.timeout = Mainloop.timeout_add_seconds(1.0, this.updateLevels.bind(this));
    }
    stopTimeout(){
        if(this.timeout){
            Mainloop.source_remove(this.timeout);
            this.timeout = null;
        }
    }
    updateLevels(){
        this.levels.forEach(l => {
            l.updateLevel();
        });
        return true;
    }
});
    
const QuickToggles = GObject.registerClass(
class QuickToggles extends St.BoxLayout{
    _init(systemLevels, powerButton){
        super._init({
            style_class: 'container',
            vertical: true,
            x_expand: true
        });

        let network = new Network.Indicator();
        this.networkMenu = network._wirelessToggle.menu.actor;
        this.networkMenu.clear_constraints();
        this.networkMenu.add_style_class_name('wifi-menu');   

        this.networkToggle = network._wirelessToggle;
        this.networkToggle.add_style_class_name('quick-toggle-long');
        this.networkToggle._label.x_expand = true;
        this.networkToggle.x_expand = true;
        this.networkToggle.y_expand = true;


        if (Config.HAVE_BLUETOOTH){
            let bt = new Bluetooth.Indicator();
            this.bluetooth = bt.quickSettingsItems[0];

            this.bluetooth.add_style_class_name('quick-toggle-long');
            this.bluetooth._label.x_expand = true;
            this.bluetooth.x_expand = true;
            this.bluetooth.show();
            this.bluetooth.connect('notify::visible', () => bluetooth.quickSettingsItems[0].show() );
        }

        let powerProfiles = new PowerProfiles.Indicator();
        let nightLight = new NightLight.Indicator();
        let darkMode = new DarkMode.Indicator();
        let dnd = new DoNotDisturbToggle();
        if(systemLevels){
            this.levels = new LevelsBox();
            let bind = Main.panel.statusArea.quickSettings.menu.connect('open-state-changed',
                (self, open) => {
                    if(open) this.levels.startTimeout();
                    else this.levels.stopTimeout();
                }
            );
            this.levels.updateLevels();
            this.connect('destroy', ()=> Main.panel.statusArea.quickSettings.menu.disconnect(bind));
        } 
        if(powerButton){
            this.power = new PowerButton();
            this.power.x_expand = true;
            this.power.child.x_align = Clutter.ActorAlign.CENTER;
            this.power.add_style_class_name('button');
        }

        powerProfiles.quickSettingsItems[0]._menuButton.hide();
        powerProfiles.quickSettingsItems[0]._label.hide();
        nightLight.quickSettingsItems[0]._label.hide();
        darkMode.quickSettingsItems[0]._label.hide();
        powerProfiles.quickSettingsItems[0]._label.hide();
        dnd._label.hide();

        powerProfiles.quickSettingsItems[0]._icon.x_expand = true;
        nightLight.quickSettingsItems[0]._icon.x_expand = true;
        darkMode.quickSettingsItems[0]._icon.x_expand = true;
        powerProfiles.quickSettingsItems[0]._icon.x_expand = true;
        dnd._icon.x_expand = true;

        let row1 = new St.BoxLayout({ style_class: 'container', y_expand: true });
        let row2 = new St.BoxLayout({ style_class: 'container', y_expand: true });
        let row3 = new St.BoxLayout({ style_class: 'container', y_expand: true });

        if(Config.HAVE_BLUETOOTH){
            row1.add_child(dnd);
            row1.add_child(nightLight.quickSettingsItems[0]);
            row1.add_child(powerProfiles.quickSettingsItems[0]);
    
            row2.add_child(darkMode.quickSettingsItems[0]);
            row2.add_child(this.bluetooth);
        }else{
            row1.add_child(dnd);
            row1.add_child(nightLight.quickSettingsItems[0]);

            row2.add_child(powerProfiles.quickSettingsItems[0]);
            row2.add_child(darkMode.quickSettingsItems[0]);
        }

        let wifi = Main.panel.statusArea.quickSettings._network._wirelessToggle.visible
        if(wifi) row3.add_child(this.networkToggle);

        if(this.power) row3.add_child(this.power);

        let toggles = new St.BoxLayout({ style_class: 'container', vertical: true, x_expand: true });
        let hbox = new St.BoxLayout({ style_class: 'container' });

        toggles.add_child(row1);
        toggles.add_child(row2);
        if(wifi || this.power)
            toggles.add_child(row3);
        
        hbox.add_child(toggles);
        if(this.levels) hbox.add_child(this.levels);
        
        this.add_child(hbox);
        this.add_child(this.networkMenu);
    }
});

const Notifications = GObject.registerClass(
class Notifications extends St.BoxLayout{
    _init(){
        super._init({
            vertical: true,
            style_class: 'popup-menu-content quick-settings'
        });

        //UI
        let datemenu = new imports.ui.dateMenu.DateMenuButton();
        this.notificationList = datemenu._messageList._notificationSection;

        this.clearBtn = datemenu._messageList._clearButton;
        this.clearBtn.get_parent().remove_child(this.clearBtn);

        this.list = datemenu._messageList._scrollView;
        this.list.get_parent().remove_child(this.list);

        this.mediaSection = datemenu._messageList._mediaSection;
        this.mediaSection.get_parent().remove_child(this.mediaSection);

        let hbox = new St.BoxLayout();
        hbox.add_child(new St.Label({ text: _('Notifications'), y_align: Clutter.ActorAlign.CENTER }));
        hbox.add_child(this.clearBtn)

        this.add_child(hbox);
        this.add_child(this.list);

        //sync notifications
        let stockNotifications = Main.panel.statusArea.dateMenu._messageList._notificationSection;
        let notifications = stockNotifications._messages;
        notifications.forEach(n => {
            let notification = new Calendar.NotificationMessage(n.notification);
            this.notificationList.addMessage(notification);
        });

        //hide on zero notifs
        this.clearBtn.connect('notify::reactive', () => {
            this.clearBtn.reactive ? this.show() : this.hide();
        });
        if(!this.clearBtn.reactive) this.hide();

        this.connect('destroy', () => {
            datemenu.destroy();
            datemenu = null;
        });
    }
});

var Extension = class Extension {
    constructor() {
        this.qs = Main.panel.statusArea.quickSettings;
        this.qsChildren = this.qs.menu.box.get_children();
    }

    enable() {
        this.settings = ExtensionUtils.getSettings();
        this.settings.connect('changed::quick-toggles-style', () => this._buildUI());
        this.settings.connect('changed::quick-toggles-hide-notifications', () => this._buildUI());
        this.settings.connect('changed::quick-toggles-hide-system-levels', () => this._buildUI());
        this.settings.connect('changed::quick-toggles-hide-media', () => this._buildUI());
        this.qs.menu.box.remove_all_children();
        this.qs.menu.box.add_style_class_name('quick-settings-main');

        this._buildUI();

        let maxHeight = Main.layoutManager.primaryMonitor.height - Main.panel.height -20;
        this.qs.menu.box.style = `max-height: ${maxHeight}px; `;

        //if I want to interject other extensions
        Main.panel.aylur = this;
    }

    disable() {
        this.qs.menu.box.remove_all_children();
        this.settings = null;
        this.qs.menu.box.remove_style_class_name('quick-settings-main')
        this.qs.menu.box.style = '';

        this.qsChildren.forEach(ch => {
            this.qs.menu.box.add_child(ch);
        });
    }

    _buildUI(){
        this.qs.menu.box.remove_all_children();

        let systemLevels = !this.settings.get_boolean('quick-toggles-hide-system-levels');
        this.quickToggles = new QuickToggles(systemLevels, !systemLevels);

        if(!this.settings.get_boolean('quick-toggles-hide-media'))
            this.mediaBox = new MediaBox();
        else if(this.mediaBox) this.mediaBox = null;

        this.levelsBox = new LevelsBox();
        this.sliderBox = new SliderBox();
        this.systemBox = new QuickSettingsSystem();
        this.bottom = new QuickTogglesBottom();

        let layout = this.settings.get_int('quick-toggles-style');
        switch (layout) {
            case 0:  this._layout0(); break;
            case 1:  this._layout1(); break;
            case 2:  this._layout2(); break;
            default: this._layout0(); break;
        }

        if(!this.settings.get_boolean('quick-toggles-hide-notifications')){
            this.notifications = new Notifications();
            this.qs.menu.box.add_child(this.notifications);
        }
    }

    _layout0(){
        this.sliderBox.add_style_class_name('button');
        if(this.mediaBox) this.mediaBox.add_style_class_name('button');

        let box = new St.BoxLayout({
            vertical: true,
            style_class: 'popup-menu-content quick-settings'
        });
        box.add_child(this.systemBox);
        box.add_child(this.sliderBox);
        if(this.mediaBox) box.add_child(this.mediaBox);
        box.add_child(this.quickToggles);
        box.add_child(this.bottom);

        this.qs.menu.box.add_child(box);
    }

    _layout1(){
        this.systemActions = new SystemActionsBox();
        
        this.quickToggles.add_style_class_name('popup-menu-content quick-settings');
        this.sliderBox.add_style_class_name('popup-menu-content quick-settings');
        if(this.mediaBox) this.mediaBox.add_style_class_name('popup-menu-content quick-settings');
        this.systemActions.add_style_class_name('popup-menu-content quick-settings');
        
        this.qs.menu.box.add_child(this.quickToggles);
        this.qs.menu.box.add_child(this.sliderBox);
        if(this.mediaBox) this.qs.menu.box.add_child(this.mediaBox);
        this.qs.menu.box.add_child(this.systemActions);
    }

    _layout2(){
        this.systemActions = new SystemActionsBox();

        this.sliderBox.add_style_class_name('button');
        if(this.mediaBox) this.mediaBox.add_style_class_name('button');

        let box = new St.BoxLayout({
            vertical: true,
            style_class: 'popup-menu-content quick-settings'
        });
        box.add_child(this.quickToggles);
        box.add_child(this.sliderBox);
        if(this.mediaBox) box.add_child(this.mediaBox);
        box.add_child(this.systemActions);

        this.qs.menu.box.add_child(box);
    }
}