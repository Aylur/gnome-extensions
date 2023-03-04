'use strict';

const { GObject, St, Clutter, GLib, Gio, GnomeDesktop, Shell } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Util = imports.misc.util;
const AppFavorites = imports.ui.appFavorites;
const Dash = imports.ui.dash;
const SystemActions = imports.misc.systemActions;
const Media = Me.imports.shared.media;
const SystemLevels = Me.imports.shared.systemLevels;

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

const DashWidget = GObject.registerClass(
class DashWidget extends St.BoxLayout{
    _init(settings, module, parentDialog = null, properties = {}){
        super._init(properties);
        this._parentDialog = parentDialog;
        this._settings = settings;
        this._module = module;
        this._connections = [];
        this._connect('y-align');
        this._connect('x-align');
        this._connect('y-expand');
        this._connect('x-expand');
        this._connect('width');
        this._connect('height');
        this._connect('background');
        this.connect('destroy', this._onDestroy.bind(this));
    }

    _onDestroy(){
        this._connections.forEach(c => this._settings.disconnect(c) );
        this._settings = null;
    }

    _connect(name){
        this._connections.push(
            this._settings.connect(`changed::dash-${this._module}-${name}`,
                () => this._sync()
            )
        )
    }

    _sync(){
        this.y_align = this._parseAlign('y');
        this.x_align = this._parseAlign('x');
        this.y_expand = this._settings.get_boolean(`dash-${this._module}-y-expand`);
        this.x_expand = this._settings.get_boolean(`dash-${this._module}-x-expand`);
        let width  = this._settings.get_int(`dash-${this._module}-width`);
        let height = this._settings.get_int(`dash-${this._module}-height`);
        this.style = `
            ${ width > 0 ? `width: ${width}px;` : ''}
            ${ height > 0 ? `height: ${height}px;` : ''}
        `;
        this._hasBackground = this._settings.get_boolean(`dash-${this._module}-background`);
        this._hasBackground ? 
            this.style_class = `container dash-widget ${this._module}-widget events-button`:
            this.style_class = `container dash-widget ${this._module}-widget`;
    }

    _parseAlign(axis){
        let num = this._settings.get_int(`dash-${this._module}-${axis}-align`);
        switch (num) {
            case 1: return Clutter.ActorAlign.START;
            case 2: return Clutter.ActorAlign.CENTER;
            case 3: return Clutter.ActorAlign.END;
            default: return Clutter.ActorAlign.FILL;
        }
    }
});

const HoverButton = GObject.registerClass(
class HoverButton extends St.Button{
    _init(content, hoverText, callback = () => {}, styleClass = ''){
        super._init({
            child: content,
            style_class: styleClass,
            x_expand: true,
            y_expand: true,
            can_focus: true,
            track_hover: true
        });
        this.connect('clicked', callback);
        this.connect('notify::hover', () => this._toggleHoverLabel());
        this._hoverLabel = new St.Label({
            style_class: 'dash-label',
            text: hoverText
        });
        this.child.x_align = Clutter.ActorAlign.CENTER;
        this.child.y_align = Clutter.ActorAlign.CENTER;
    }

    _toggleHoverLabel() {
        if(this.hover){
            Main.layoutManager.addTopChrome(this._hoverLabel);
            this._hoverLabel.opacity = 0;
            let [stageX, stageY] = this.get_transformed_position();
            const iconWidth = this.allocation.get_width();
            const labelWidth = this._hoverLabel.get_width();
            const xOffset = Math.floor((iconWidth - labelWidth) / 2);
            const x = Math.clamp(stageX + xOffset, 0, global.stage.width - labelWidth);
            const y = stageY - this._hoverLabel.height - this.height;
            this._hoverLabel.set_position(x, stageY);
    
            this._hoverLabel.ease({
                opacity: 255,
                duration: 300,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }else{
            Main.layoutManager.removeChrome(this._hoverLabel);
        }
    }
});

var UserWidget = GObject.registerClass(
class UserWidget extends DashWidget{
    _init(settings, parentDialog){
        super._init(settings, 'user', parentDialog);
        this._connect('icon-roundness');
        this._connect('icon-width');
        this._connect('icon-height');
        this._connect('vertical');
        this._sync();
    }

    _sync(){
        this.vertical = this._settings.get_boolean('dash-user-vertical');
        this._buildUI();
        super._sync();
    }

    _buildUI(){
        this.destroy_all_children();

        let userBtn = new St.Button({
            x_align: this.vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.END,
            y_align: this.vertical ? Clutter.ActorAlign.END : Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
            style_class: 'user-icon-button button',
            child: new St.Widget({
                style: `
                    background-image: url("/var/lib/AccountsService/icons/${GLib.get_user_name()}");
                    background-size: cover;
                    border-radius: ${this._settings.get_int(`dash-user-icon-roundness`)}px;
                `,
            }),
            style: `
                border-radius: ${this._settings.get_int(`dash-user-icon-roundness`)}px;
                width: ${this._settings.get_int(`dash-user-icon-width`)}px;
                height: ${this._settings.get_int(`dash-user-icon-height`)}px;
            `
        });
        userBtn.connect('clicked', () => {
            this._parentDialog.close();
            Shell.AppSystem.get_default().lookup_app('gnome-user-accounts-panel.desktop').activate();
        });

        let textBox = new St.BoxLayout({
            vertical: true,
            style_class: 'text-box',
            y_align: this.vertical ? Clutter.ActorAlign.START :  Clutter.ActorAlign.CENTER,
            x_align: this.vertical ? Clutter.ActorAlign.CENTER :  Clutter.ActorAlign.START,
            x_expand: true,
            y_expand: true,
        });
        textBox.add_child(new St.Label({
            text: GLib.get_user_name(),
            y_align: Clutter.ActorAlign.END,
            x_align: this.vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START
        }));
        textBox.add_child(new St.Label({
            text: this._greet(),
            y_align: Clutter.ActorAlign.START,
            x_align: this.vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START
        }));

        this.add_child(userBtn);
        this.add_child(textBox);
    }

    _greet(){
        let time = new Date();
        let hour = time.getHours();

        let greet = _('Good Evening!');
        if(hour > 6) { greet = _('Good Morning!');  }
        if(hour > 12){ greet = _('Good Afternoon!');}
        if(hour > 18){ greet = _('Good Evening!');  }
        return greet;
    }
});

var LevelsWidget = GObject.registerClass(
class LevelsWidget extends DashWidget{
    _init(settings, parentDialog){
        super._init(settings, 'levels', parentDialog);
        this._connect('vertical');
        this._sync();
    }

    _sync(){
        this.vertical = this._settings.get_boolean('dash-levels-vertical');
        this._buildUI();
        super._sync();
    }

    _buildUI(){
        this.destroy_all_children();
        this._levels = new SystemLevels.LevelsBox(this._settings, 'dash-levels-show', this.vertical);
        this._parentDialog.connectObject(
            'opened', () => this._levels.startTimeout(),
            'closed', () => this._levels.stopTimeout(),
            this._levels
        );
        this._levels.connect('destroy', () => this._parentDialog.disconnectObject(this._levels));
        this.add_child(this._levels);
    }
});

const MediaBox = GObject.registerClass(
class MediaBox extends Media.MediaBox{
    _init(settings){
        super._init(settings, 'dash-media');
    }

    _buildPlayerUI(){
        this.style = ``;
        super._buildPlayerUI();
        switch (this.layout) {
            case 1: this._normal(false); break;
            case 2: this._labelOnCover(); break;
            case 3: this._labelOnCover(false); break;
            case 4: this._full(); break;
            default: this._normal(); break;
        }
    }

    _full(){
        super._full();
        if(!this.showVolume){
            this.style += `
                border-radius: ${this.coverRadius}px;
                padding: 0;
                border: none;
            `;
        }
    }

    _onNoPlayer(){
        this.set_child(new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
            x_expand: true,
            text: _('Nothing Playing')
        }))
    }
});

var MediaWidget = GObject.registerClass(
class MediaWidget extends DashWidget{
    _init(settings){
        super._init(settings, 'media');
        this._media = new MediaBox(settings);
        this.add_child(this._media);
        this._sync();
        this._media.connect('notify::style', () => this._sync())
    }

    _sync(){
        super._sync();
        this.style += this._media.style;
    }
});

var LinksWidget = GObject.registerClass(
class LinksWidget extends DashWidget{
    _init(settings, parentDialog){
        super._init(settings, 'links', parentDialog);
        this._connect('names');
        this._connect('urls');
        this._connect('icon-size');
        this._connect('vertical');
        this._sync();
    }

    _sync(){
        super._sync();

        this.vertical = this._settings.get_boolean('dash-links-vertical');
        this.remove_all_children();

        let names = this._settings.get_strv('dash-links-names');
        let urls  = this._settings.get_strv('dash-links-urls');

        for (let i = 0; i < urls.length; i++) 
            this.add_child( this._button(names[i], urls[i]) );
    }

    _button(name, link){
        if(!name) name = 'weblink';
        return new HoverButton(
            new St.Icon({
                gicon: Gio.icon_new_for_string(
                    `${Me.path}/media/${name}-symbolic.svg`
                ),
                icon_size: this._settings.get_int('dash-links-icon-size')
            }),
            link,
            () => {
                Util.spawnCommandLine(`xdg-open ${link}`);
                this._parentDialog.close();
            },
            this._hasBackground ? 'message-media-control' : 'events-button'
        );
    }
});

var ClockWidget = GObject.registerClass(
class ClockWidget extends DashWidget{
    _init(settings){
        super._init(settings, 'clock');
        this._connect('vertical');
        this._sync();

        this.clock = this._label('clock');
        this.date = this._label('date');
        this.day = this._label('day');

        let vbox = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
            x_expand: true,
        });
        vbox.add_child(this.day);
        vbox.add_child(this.date);
        this.add_child(this.clock);
        this.add_child(vbox);

        this.wallclock = new GnomeDesktop.WallClock({ time_only: true });
        this.wallclock.connectObject('notify::clock', () => this._updateClock(), this);
        this.connect('destroy', () => this.wallclock.disconnectObject(this));
    
        this._updateClock();
    }

    _updateClock(){
        this.clock.text = GLib.DateTime.new_now_local().format('%H:%M');
        this.date.text = GLib.DateTime.new_now_local().format('%Y. %m. %d.');
        this.day.text = GLib.DateTime.new_now_local().format('%A');
    }

    _sync(){
        this.vertical = this._settings.get_boolean('dash-clock-vertical');
        super._sync();
    }

    _label(name){
        return new St.Label({
            style_class: name,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });
    }
});

const AppBtn = GObject.registerClass(
class AppBtn extends Dash.DashIcon{
    _init(app, parentDialog, settings, pos){
        super._init(app);

        this.x_align = Clutter.ActorAlign.CENTER;
        this.y_align = Clutter.ActorAlign.CENTER;
        this.x_expand = true;
        this.y_expand = true;
        this.app = app;
        this.pos = pos;
        this.settings = settings;

        this.connect('clicked', () => parentDialog.close());
        this._changeIconSize();
        this.settings.connectObject('changed::dash-apps-icon-size', this._changeIconSize.bind(this), this);
        this.connect('destroy', () => this.settings.disconnectObject(this));
    }

    _changeIconSize(){
        this.icon.setIconSize(this.settings.get_int('dash-apps-icon-size'));
    }

    acceptDrop(source){
        AppFavorites.getAppFavorites().moveFavoriteToPos(
            source.app.get_id(),
            this.pos
        )
    }
});

var AppsWidget = GObject.registerClass(
class AppsWidget extends DashWidget{
    _init(settings, parentDialog){
        super._init(settings, 'apps', parentDialog);
        this.vertical = true;
        this._connect('rows');
        this._connect('cols');
        AppFavorites.getAppFavorites().connectObject('changed', this._sync.bind(this), this);
        this._sync();
    }

    _onDestroy(){
        super._onDestroy();
        AppFavorites.getAppFavorites().disconnectObject(this);
    }

    _sync(){
        this.remove_all_children();
        this._buildUI();
        super._sync();
    }

    _buildUI(){
        let rows = this._settings.get_int('dash-apps-rows');
        let cols = this._settings.get_int('dash-apps-cols');

        this.rows = [];
        let favs = AppFavorites.getAppFavorites().getFavorites();
        for (let i = 0; i < rows; i++) {
            let row = new St.BoxLayout({
                style_class: 'container',
                y_expand: true,
                x_expand: true
            });
            this.rows.push(row);
            this.add_child(row);
        }
        let k = 0;
        for (let i = 0; i < favs.length; i++) {
            if(i !== 0 && i%cols === 0) k++;
            this.rows[k]?.add_child(new AppBtn(favs[i], this._parentDialog, this._settings, i));
        }
    }

    _button(app, index){
        //TODO with hoverButton
    }
});

var SettingsWidget = GObject.registerClass(
class SettingsWidget extends DashWidget{
    _init(settings, parentDialog){
        super._init(settings, 'settings', parentDialog);
        this._connect('icon-size');
        this._connect('vertical');
        this._sync();
    }

    _sync(){
        super._sync();

        this.vertical = this._settings.get_boolean('dash-settings-vertical');
        let iconSize = this._settings.get_int('dash-settings-icon-size');

        this.destroy_all_children();
        [
            this._button('network-wireless-signal-good-symbolic', 'gnome-wifi-panel', iconSize, _('WiFi')),
            this._button('bluetooth-active-symbolic', 'gnome-bluetooth-panel', iconSize, _('Bluetooth')),
            this._button('org.gnome.Settings-symbolic', 'org.gnome.Settings', iconSize, _('Settings')),
        ]
        .forEach(btn => this.add_child(btn));
    }

    _button(icon, panel, iconSize, label){
        return new HoverButton(
            new St.Icon({ 
                icon_name: icon, 
                icon_size: iconSize
            }),
            label,
            () => {
                Shell.AppSystem.get_default().lookup_app(`${panel}.desktop`).activate();
                this._parentDialog.close();
            },
            this._hasBackground ? 'message-media-control' : 'events-button'
        );
    }
});

var SystemWidget = GObject.registerClass(
class SystemWidget extends DashWidget{
    _init(settings, parentDialog){
        super._init(settings, 'system', parentDialog);
        this._connect('icon-size');
        this._connect('layout');
        this._sync();
    }

    _sync(){
        super._sync();
        
        let iconSize = this._settings.get_int('dash-system-icon-size');
        let layout = this._settings.get_int('dash-system-layout');

        this.destroy_all_children();
        let btns = [
            this._button('system-shutdown-symbolic', 'power-off', iconSize, _('Power Off')),
            this._button('system-reboot-symbolic', 'restart', iconSize, _('Reboot')),
            this._button('system-log-out-symbolic', 'logout', iconSize, _('Log Out')),
            this._button('weather-clear-night-symbolic', 'suspend', iconSize, _('Suspend')),
        ];
        switch (layout) {
            case 2:
                this.vertical = false;
                let col = () => { return new St.BoxLayout({
                    style_class: 'container',
                    vertical: true,
                    x_expand: true,
                    y_expand: true
                })};
                let col1 = col();
                let col2 = col();
                col1.add_child(btns[2]);
                col1.add_child(btns[1]);
                col2.add_child(btns[0]);
                col2.add_child(btns[3]);
                this.add_child(col1);
                this.add_child(col2);
                break;

            case 1:
                this.vertical = true;
                btns.forEach(btn => this.add_child(btn));
                break;

            default:
                this.vertical = false;
                btns.reverse().forEach(btn => this.add_child(btn));
                break;
        }
    }

    _button(icon, action, iconSize, label){
        return new HoverButton(
            new St.Icon({ 
                icon_name: icon, 
                icon_size: iconSize
            }),
            label,
            () => {
                SystemActions.getDefault().activateAction(action);
                this._parentDialog.close();
            },
            this._hasBackground ? 'message-media-control' : 'events-button'
        );
    }
});