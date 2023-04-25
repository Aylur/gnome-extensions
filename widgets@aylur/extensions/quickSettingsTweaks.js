const { GObject, St, Clutter, GLib, Gio, GnomeDesktop, Shell, UPowerGlib: UPower } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const QS = Main.panel.statusArea.quickSettings;
const { QuickSlider, QuickToggle } = imports.ui.quickSettings;
const SystemActions = imports.misc.systemActions;
const Media = Me.imports.shared.media;
const { NotificationList } = Me.imports.shared.notificationList;
const SystemLevels = Me.imports.shared.systemLevels;
const { VolumeMixer } = Me.imports.shared.volumeMixer;

const { loadInterfaceXML } = imports.misc.fileUtils;
const DisplayDeviceInterface = loadInterfaceXML('org.freedesktop.UPower.Device');
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

const NIGHT_LIGHT_MAX = 4700;
const NIGHT_LIGHT_MIN = 1400;

const QuickSettingsSystem = GObject.registerClass(
class QuickSettingsSystem extends St.BoxLayout{
    _init(){
        super._init({ style_class: 'container' });

        let userBtn = this._addBtn('', 
            () =>  Shell.AppSystem.get_default().lookup_app('gnome-user-accounts-panel.desktop').activate()
        );
        userBtn.style_class = 'icon-button user-btn';
        userBtn.set_child(new St.Widget({
            y_expand: true,
            style_class: 'user-icon icon-button',
            style: `
                background-image: url("/var/lib/AccountsService/icons/${GLib.get_user_name()}");
                background-size: cover;`,
        }));

        let greetBox = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        greetBox.add_child(new St.Label({ text: GLib.get_user_name() }));
        greetBox.add_child(new St.Label({ text: this._greet() }));

        this.add_child(userBtn);
        this.add_child(greetBox);
        this.add_child(new St.Widget({ x_expand: true }));
        this.add_child(this._addBtn('org.gnome.Settings-symbolic',
            () => Shell.AppSystem.get_default().lookup_app('org.gnome.Settings.desktop').activate()));

        this.add_child(this._addBtn('system-lock-screen-symbolic', 
            () => SystemActions.getDefault().activateAction('lock-screen')));

        this.add_child(this._addBtn('system-shutdown-symbolic',
            () => SystemActions.getDefault().activateAction('power-off')));
    }

    _greet(){
        let time = new Date();
        let hour = time.getHours();

        let greet = _('Good Evening!');
        if(hour > 6){ greet = _('Good Morning!'); }
        if(hour > 12){greet = _('Good Afternoon!');}
        if(hour > 18){greet = _('Good Evening!');}

        return greet;
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
    _init(button) {
        super._init({ style_class: button ? 'quick-toggle button small-toggle' : 'power-btn' });
        
        let box = new St.BoxLayout({ style_class: 'container' });
        this._icon = new St.Icon({ style_class: 'quick-toggle-icon' });
        this._label = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
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

const SystemActionsBox = GObject.registerClass(
class SystemActionsBox extends St.BoxLayout{
    _init(){
        super._init({ style_class: 'container system-actions' });

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
            style_class: 'icon-button button quick-toggle',
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

const Footer = GObject.registerClass(
class Footer extends St.BoxLayout{
    _init(){
        super._init({ style_class: 'footer' });

        this.clock = new St.Label();
        this.wallClock = new GnomeDesktop.WallClock({ time_only: true });
        this.wallClock.connectObject(
            'notify::clock',
            () => this._update(),
            this
        );
        this._update();

        this.add_child(new PowerButton());
        this.add_child(new St.Widget({ x_expand: true }));
        this.add_child(this.clock);

        this.connect('destroy', () => {
            this.wallClock.disconnectObject(this);
            this.wallClock = null;
        });
    }

    _update(){
        this.clock.text = GLib.DateTime.new_now_local()
            .format('%A | %Y. %m. %d. | %H:%M');
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
        this.connect('destroy', () => this._settings.run_dispose());
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

const SmallToggle = GObject.registerClass(
class SmallToggle extends St.Button{
    _init(schema, setting){
        super._init({
            style_class: 'button quick-toggle small-toggle',
            x_expand: true
        });
        this._icon = new St.Icon({ style_class: 'quick-toggle-icon' });
        this.set_child(this._icon);
        this._settings = new Gio.Settings({ schema_id: schema });
        this._settings.connect(`changed::${setting}`, () => this.sync());
        
        this.connectObject(
            'destroy', () => this._settings.run_dispose(),
            'clicked', () => this.toggle(setting),
            this);
    }

    toggle(setting) {
        let enabled = this._settings.get_boolean(`${setting}`);
        this._settings.set_boolean(`${setting}`, !enabled);
        this.sync();
    }

    sync(){}
});

const NightLightToggle = GObject.registerClass(
class NightLightToggle extends SmallToggle{
    _init(){
        super._init('org.gnome.settings-daemon.plugins.color', 'night-light-enabled');
        this._icon.icon_name = 'night-light-symbolic';
        this.sync();
    }

    sync(){
        let enabled = this._settings.get_boolean('night-light-enabled');
        enabled ? this.checked = true : this.checked = false; 
    }
});

const DoNotDisturbToggle = GObject.registerClass(
class DoNotDisturbToggle extends SmallToggle{
    _init(){
        super._init('org.gnome.desktop.notifications', 'show-banners');
        this.sync();
    }

    sync(){
        let enabled = this._settings.get_boolean('show-banners');
        if(enabled){
            this._icon.icon_name = 'org.gnome.Settings-notifications-symbolic';
            this.checked = false;
        }else{
            this._icon.icon_name = 'notifications-disabled-symbolic';
            this.checked = true;
        }
    }
});

const DarkModeToggle = GObject.registerClass(
class DarkModeToggle extends SmallToggle{
    _init(){
        super._init('org.gnome.desktop.interface', 'color-scheme');
        this._icon.icon_name = 'dark-mode-symbolic';
        this.sync();
    }

    toggle(){
        Main.layoutManager.screenTransition.run();
        this._settings.set_string('color-scheme',
            this.checked ? 'default' : 'prefer-dark');
    }

    sync(){
        const colorScheme = this._settings.get_string('color-scheme');
        this.checked = colorScheme === 'prefer-dark';
    }
});

const SmallToggleRow = GObject.registerClass(
class SmallToggleRow extends St.BoxLayout{
    _init(powerButton = true){
        super._init({ style_class: 'container' });
        if(powerButton) this.add_child(new PowerButton(true));
        this.add_child(new NightLightToggle());
        this.add_child(new DoNotDisturbToggle());
        this.add_child(new DarkModeToggle());
    }
});

const LevelsBox = GObject.registerClass(
class LevelsBox extends SystemLevels.LevelsBox{
    _init(settings){
        super._init(settings, 'quick-settings-levels-show');
        this.y_expand = false;
        this.add_style_class_name('quick-settings-levels');

        let bind = QS.menu.connect('open-state-changed', (self, open) => {
            if(open) this.startTimeout();
            else this.stopTimeout();
        });

        this.updateLevels();
        this.connect('destroy', () => QS.menu.disconnect(bind));
    }
});
    
const MediaBox = GObject.registerClass(
class MediaBox extends Media.MediaBox{
    _init(settings){
        super._init(settings, 'quick-settings-media');
        this.add_style_class_name('button media');
        this.y_expand = false;
    }

    _buildPlayerUI(){
        this.style = ``;
        super._buildPlayerUI();
        switch (this.layout) {
            case 1: this._stock(); break;
            case 2: this._full(); break;
            default: this._normal(); break;
        }
    }

    _full(){
        super._full();
        if(!this.showVolume)
            this.style = `
                border-radius: ${this.coverRadius}px;
                padding: 0;    
            `;
    }

    _stock(){
        let p = this.player;
        p.vertical = false;
        let vbox = new St.BoxLayout({
            vertical: true,
            style_class: 'media-container',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        let hbox = new St.BoxLayout();
        hbox.add_child(p.titleBox);
        hbox.add_child(new St.Widget({ x_expand: true }));
        hbox.add_child(p.controlsBox);

        vbox.add_child(hbox);
        if(this.showVolume) vbox.add_child(p.volumeBox);

        p.add_child(p.mediaCover);
        p.add_child(vbox);
        p.titleBox.y_align = Clutter.ActorAlign.CENTER;
        p.controlsBox.y_align = Clutter.ActorAlign.CENTER;
    }

    _normal(){
        super._normal(false);
        this.player.get_last_child().x_align = Clutter.ActorAlign.FILL;
    }
});

const MultiMediaBox = GObject.registerClass(
class MultiMediaBox extends MediaBox{
    _init(settings){
        super._init(settings);
        this.remove_style_class_name('button media');
        this.child = new St.BoxLayout({
            vertical: true,
            style_class: 'container'
        });
    }

    _full(){
        super._full();
        if(!this.showVolume){
            this.player.style = `
                border-radius: ${this.coverRadius}px;
                padding: 0;
            `;
            this.player.x_align = Clutter.ActorAlign.FILL;
            this.player.remove_style_class_name('button');
        }
    }

    _sync(){
        this.coverRadius = this.settings.get_int(`${this.settingName}-cover-roundness`);
        this.fade = this.settings.get_boolean(`${this.settingName}-fade`);
        let secondary = this.settings.get_boolean(`${this.settingName}-show-loop-shuffle`);
        let mprisList = this.getPlayers();
        if(mprisList.length === 0) this._onNoPlayer();
        else{
            this.show();
            this.child.remove_all_children();
            mprisList.forEach(p => {
                this.player = new Media.PlayerWidget(p, secondary, this.coverRadius);
                this.player.add_style_class_name('media');
                this.player.add_style_class_name('button');
                this._buildPlayerUI();
                this.child.add_child(this.player);
            });
        }
    }
});

class Toggles{
    constructor(settings){
        this.menus = QS.menu._overlay;
        this.grid = QS.menu._grid;
        this.addedItems = [];

        //toggles in order
        this.system = QS._system.quickSettingsItems[0];
        this.output = QS._volume.quickSettingsItems[0];
        this.input = QS._volume.quickSettingsItems[1];
        this.brightness = QS._brightness.quickSettingsItems[0];

        this.wired = QS._network?._wiredToggle;
        this.wifi = QS._network?._wirelessToggle;
        this.modem = QS._network?._modemToggle;
        this.networkBt = QS._network?._btToggle;
        this.vpn = QS._network?._vpnToggle;
        this.bt = QS._bluetooth?.quickSettingsItems[0];
        this.power = QS._powerProfiles.quickSettingsItems[0];
        this.nightLight = QS._nightLight.quickSettingsItems[0];
        this.darkMode = QS._darkMode.quickSettingsItems[0];
        this.rfKill = QS._rfkill.quickSettingsItems[0];
        this.rotate = QS._autoRotate.quickSettingsItems[0];

        this.bgApps = QS._backgroundApps.quickSettingsItems[0];

        this.list = [
            this.system,
            this.output,
            this.input,
            this.brightness,
            settings.get_boolean('quick-settings-show-wired') ? null : this.wired,
            settings.get_boolean('quick-settings-show-wifi') ? null : this.wifi,
            settings.get_boolean('quick-settings-show-modem') ? null : this.modem,
            settings.get_boolean('quick-settings-show-network-bt') ? null : this.networkBt,
            settings.get_boolean('quick-settings-show-vpn') ? null : this.vpn,
            settings.get_boolean('quick-settings-show-bluetooth') ? null : this.bt,
            settings.get_boolean('quick-settings-show-power') ? null : this.power,
            this.nightLight,
            this.darkMode,
            settings.get_boolean('quick-settings-show-airplane') ? null : this.rfKill,
            settings.get_boolean('quick-settings-show-rotate') ? null : this.rotate,
            settings.get_boolean('quick-settings-show-bg-apps') ? null : this.bgApps
        ];
    }

    addToGrid(item, childAbove, colSpan = 2){
        this.grid.add_child(item);
        this.grid.layout_manager.child_set_property(
            this.grid, item, 'column-span', colSpan);
        if(childAbove) this.grid.set_child_above_sibling(item, childAbove);
        this.addedItems.push(item);
    }

    detach(){
        this.list.forEach(t => {
            if(t) this.grid.remove_child(t)
            if(t?.menu){
                this.menus.remove_child(t.menu.actor);
                t.menu.noDim = t.menu.connect('open-state-changed', () => {
                    QS.menu._setDimmed(false);
                });
            }
        });
    }

    reattach(){
        this.addedItems.forEach(i => i.destroy());
        this.addedItems = [];
        this.list.reverse().forEach(t => {
            if(t){
                t.get_parent()?.remove_child(t);
                this.grid.insert_child_at_index(t, 0);
                t._sync?.();
                if(t.menu){
                    t.menu.actor.get_parent()?.remove_child(t.menu.actor);
                    this.menus.insert_child_at_index(t.menu.actor, 0);
                    t.menu.close();
                    if(t.menu.noDim){
                        t.menu.disconnect(t.menu.noDim);
                        t.menu.noDim = null;
                    } 
                }
            }
        });
    }

    detachGrid(){ this.grid.get_parent()?.remove_child(this.grid) }

    reattachGrid(){
        this.detachGrid();
        QS.menu.box.add_child(this.grid);
    }
}

class QuickSettingsTweaks{
    constructor(settings){
        this.settings = settings;
    }

    reload(){
        if(this.toggles) this.reset();
        this.toggles = new Toggles(this.settings);
        
        let adjust = this.settings.get_boolean('quick-settings-adjust-roundness');
        if(adjust) QS.menu.box.add_style_class_name('adjusted');

        let height = Main.layoutManager.primaryMonitor.height - Main.panel.height;
        QS.menu.box.style = `
            width: ${this.settings.get_int('quick-settings-menu-width')}px;
            max-height: ${height-14}px;
        `;
        
        this.showMedia = this.settings.get_boolean('quick-settings-show-media');
        this.showNotificiations = this.settings.get_boolean('quick-settings-show-notifications');
        this.showLevels = this.settings.get_boolean('quick-settings-show-system-levels');
        this.showAppVolumeMixer = this.settings.get_boolean('quick-settings-show-app-volume-mixer');

        this.toggles.detach();
        let layout = this.settings.get_int('quick-settings-style');
        switch (layout) {
            case 1: this._normal(); break;
            case 2: this._compact(); break;
            case 3: this._separated(); break;
            default: this._stock(); break;
        }
        this.toggles.brightness._sync();
    }

    _stock(){
        this.toggles.grid.add_style_class_name('popup-menu-content');
        this.toggles.grid.add_style_class_name('quick-settings');
        this.toggles.reattach();
        this.toggles.addToGrid(new NightLightSlider(), this.toggles.brightness);
        if(this.showAppVolumeMixer)
            this.toggles.addToGrid(new VolumeMixer(this.settings), this.toggles.output);
        
        if(this.showLevels){
            let levelsBox = new LevelsBox(this.settings);
            levelsBox.add_style_class_name('quick-container button');
            this.toggles.addToGrid( levelsBox );
        }
        if(this.showMedia){
            let multi = !this.settings.get_boolean('quick-settings-media-prefer-one');
            this.toggles.addToGrid(
                multi ? new MultiMediaBox(this.settings) : new MediaBox(this.settings)
            );
        }
        if(this.showNotificiations){
            this.notificationList = new NotificationList();
            this.notificationList.add_style_class_name('popup-menu-content');
            QS.menu.box.add_child(this.notificationList);
        }
    }

    _normal(){
        this.toggles.detachGrid();

        this.normalBox = new St.BoxLayout({
            vertical: true,
            style_class: 'popup-menu-content quick-settings container'
        });
        let sliders = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style_class: 'quick-container button'
        });
        sliders.add_child(this.toggles.output);
        sliders.add_child(this.toggles.output.menu.actor);
        if(this.showAppVolumeMixer)
            sliders.add_child(new VolumeMixer(this.settings));
        sliders.add_child(this.toggles.input);
        sliders.add_child(this.toggles.input.menu.actor);
        sliders.add_child(this.toggles.brightness);
        sliders.add_child(new NightLightSlider());
        
        this.normalBox.add_child(new QuickSettingsSystem());
        this.normalBox.add_child(sliders);
        this.normalBox.add_child(new SmallToggleRow(false));
        this.normalBox.add_child(this.toggles.grid);

        if(this.showLevels){
            let levelsBox = new LevelsBox(this.settings);
            levelsBox.add_style_class_name('quick-container button');
            this.normalBox.add_child( levelsBox );
        }
        if(this.showMedia){
            let multi = !this.settings.get_boolean('quick-settings-media-prefer-one');
            this.normalBox.add_child(
                multi ? new MultiMediaBox(this.settings) : new MediaBox(this.settings)
            );
        }

        this.normalBox.add_child(new Footer());

        QS.menu.box.add_child(this.normalBox);

        if(this.showNotificiations){
            this.notificationList = new NotificationList();
            this.notificationList.add_style_class_name('popup-menu-content');
            QS.menu.box.add_child(this.notificationList);
        }
    }

    _compact(){
        this.toggles.detachGrid();
        
        this.compactBox = new St.BoxLayout({
            vertical: true,
            style_class: 'popup-menu-content quick-settings container'
        });
        let sliders = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style_class: 'quick-container button'
        });
        sliders.add_child(this.toggles.output);
        sliders.add_child(this.toggles.output.menu.actor);
        if(this.showAppVolumeMixer)
            sliders.add_child(new VolumeMixer(this.settings));
        sliders.add_child(this.toggles.input);
        sliders.add_child(this.toggles.input.menu.actor);
        sliders.add_child(this.toggles.brightness);
        sliders.add_child(new NightLightSlider());

        this.compactBox.add_child(new SystemActionsBox());
        this.compactBox.add_child(this.toggles.grid);
        this.compactBox.add_child(new SmallToggleRow());
        this.compactBox.add_child(sliders);

        if(this.showLevels){
            let levelsBox = new LevelsBox(this.settings);
            levelsBox.add_style_class_name('quick-container button');
            this.compactBox.add_child( levelsBox );
        }
        if(this.showMedia){
            let multi = !this.settings.get_boolean('quick-settings-media-prefer-one');
            this.compactBox.add_child(
                multi ? new MultiMediaBox(this.settings) : new MediaBox(this.settings)
            );
        }

        QS.menu.box.add_child(this.compactBox);

        if(this.showNotificiations){
            this.notificationList = new NotificationList();
            this.notificationList.add_style_class_name('popup-menu-content');
            QS.menu.box.add_child(this.notificationList);
        }
    }

    _separated(){
        this.toggles.detachGrid();

        this.separatedBox = new St.BoxLayout({
            vertical: true,
            style_class: 'container'
        });

        let sliders = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style_class: 'popup-menu-content quick-settings'
        });
        sliders.add_child(this.toggles.output);
        sliders.add_child(this.toggles.output.menu.actor);
        if(this.showAppVolumeMixer)
            sliders.add_child(new VolumeMixer(this.settings));
        sliders.add_child(this.toggles.input);
        sliders.add_child(this.toggles.input.menu.actor);
        sliders.add_child(this.toggles.brightness);
        sliders.add_child(new NightLightSlider());

        let sysActions = new SystemActionsBox();
        sysActions.add_style_class_name('popup-menu-content quick-settings');
        
        this.toggles.addToGrid(new SmallToggleRow());
        this.toggles.grid.add_style_class_name('popup-menu-content quick-settings');

        this.separatedBox.add_child(sysActions);
        this.separatedBox.add_child(this.toggles.grid);
        this.separatedBox.add_child(sliders);

        if(this.showLevels){
            let levelsBox = new LevelsBox(this.settings);
            levelsBox.add_style_class_name('popup-menu-content quick-settings');
            this.separatedBox.add_child( levelsBox );
        }
        if(this.showMedia){
            let multi = !this.settings.get_boolean('quick-settings-media-prefer-one');
            let media = multi ? new MultiMediaBox(this.settings) : new MediaBox(this.settings);
            media.add_style_class_name('popup-menu-content quick-settings');
            this.separatedBox.add_child( media );
        }

        if(this.showNotificiations){
            let notificationList = new NotificationList();
            notificationList.add_style_class_name('popup-menu-content');
            this.separatedBox.add_child(notificationList);
        }

        QS.menu.box.add_child(this.separatedBox);
    }

    reset(){
        this.toggles.reattach();
        this.toggles.reattachGrid();
        QS.menu.box.style = '';
        QS.menu.box.remove_style_class_name('adjusted');
        this.toggles.grid.remove_style_class_name('popup-menu-content');
        this.toggles.grid.remove_style_class_name('quick-settings');
        if(this.notificationList){
            this.notificationList.destroy();
            this.notificationList = null;
        }
        if(this.normalBox){
            this.normalBox.destroy();
            this.normalBox = null;
        }
        if(this.compactBox){
            this.compactBox.destroy();
            this.compactBox = null;
        }
        if(this.separatedBox){
            this.separatedBox.destroy();
            this.separatedBox = null;
        }
    }
}

var Extension = class Extension{
    constructor(settings){
        this._settings = settings;
    }

    enable(){
        QS.menu.box.add_style_class_name('tweaked');
        this.tweaks = new QuickSettingsTweaks(this._settings);

        this._settings.connectObject(
            'changed::quick-settings-style',                () => this.tweaks.reload(),
            'changed::quick-settings-show-notifications',   () => this.tweaks.reload(),
            'changed::quick-settings-show-system-levels',   () => this.tweaks.reload(),
            'changed::quick-settings-show-media',           () => this.tweaks.reload(),
            'changed::quick-settings-show-app-volume-mixer',() => this.tweaks.reload(),
            'changed::quick-settings-media-prefer-one',     () => this.tweaks.reload(),
            'changed::quick-settings-menu-width',           () => this.tweaks.reload(),
            'changed::quick-settings-adjust-roundness',     () => this.tweaks.reload(),
            'changed::quick-settings-show-wired',           () => this.tweaks.reload(),
            'changed::quick-settings-show-wifi',            () => this.tweaks.reload(),
            'changed::quick-settings-show-modem',           () => this.tweaks.reload(),
            'changed::quick-settings-show-network-bt',      () => this.tweaks.reload(),
            'changed::quick-settings-show-vpn',             () => this.tweaks.reload(),
            'changed::quick-settings-show-bluetooth',       () => this.tweaks.reload(),
            'changed::quick-settings-show-power',           () => this.tweaks.reload(),
            'changed::quick-settings-show-airplane',        () => this.tweaks.reload(),
            'changed::quick-settings-show-rotate',          () => this.tweaks.reload(),
            'changed::quick-settings-show-bg-apps',         () => this.tweaks.reload(),
            this
        );

        this.tweaks.reload();

        this.binding = Main.layoutManager.connect('monitors-changed', () => this.tweaks.reload());
    }

    disable(){
        this._settings.disconnectObject(this);
        this.tweaks.reset();
        QS.menu.box.remove_style_class_name('tweaked');
        Main.layoutManager.disconnect(this.binding);
    }
}
