'use strict';

const { GObject, St, Clutter, GLib, Gio, GnomeDesktop, Shell } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;
const AppFavorites = imports.ui.appFavorites;
const Dash = imports.ui.dash;
const SystemActions = imports.misc.systemActions;
const Media = Me.imports.shared.media;
const SystemLevels = Me.imports.shared.systemLevels;

var UserBox = GObject.registerClass(
class UserBox extends St.Bin{
    _init(parentDialog, vertical = true, iconSize = 120){
        super._init({
            x_expand: true,
            y_expand: true,
            reactive: true,
            style_class: `events-button user-box`,
        });

        let box = new St.BoxLayout({
            vertical: vertical,
            style_class: 'container',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.set_child(box);
        let userIcon = new St.Button({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
            style_class: 'user-icon-button button',
            style: `
                background-image: url("/var/lib/AccountsService/icons/${GLib.get_user_name()}");
                background-size: cover;
            `,
            width: iconSize,
            height: iconSize
        });
        userIcon.connect('clicked', () => {
            parentDialog.close();
            Shell.AppSystem.get_default().lookup_app('gnome-user-accounts-panel.desktop').activate();
        });
        box.add_child(userIcon);
        let textBox = new St.BoxLayout({
            vertical: true,
            style_class: 'text-box',
            y_align: vertical ? Clutter.ActorAlign.START : Clutter.ActorAlign.CENTER
        });
        box.add_child(textBox);
        textBox.add_child(new St.Label({
            text: GLib.get_user_name(),
            y_align: Clutter.ActorAlign.END,
            x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START
        }));
        this.greeting = new St.Label({
            y_align: Clutter.ActorAlign.START,
            x_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START
        });
        textBox.add_child(this.greeting);

        this.greet();
    }

    greet(){
        let time = new Date();
        let hour = time.getHours();
        let greet = "Good Evening!";
        if(hour > 6){ greet = "Good Morning!"; }
        if(hour > 12){greet = "Good Afternoon!";}
        if(hour > 18){greet = "Good Evening!";}
        this.greeting.text = greet;
    }
});

var LevelsBox = GObject.registerClass(
class LevelsBox extends SystemLevels.LevelsBox{
    _init(settings, parentDialog, vertical){
        super._init(settings, 'dash-levels-show', vertical);
        this.add_style_class_name('events-button');
        parentDialog.connect('opened', () => this.startTimeout());
        parentDialog.connect('closed', () => this.stopTimeout());
    }
});

var MediaBox = GObject.registerClass(
class MediaBox extends Media.MediaBox{
    _init(settings){
        super._init(settings, 'dash-media');
        this.add_style_class_name('events-button');
    }

    _buildPlayerUI(){
        this.style = `
            min-width: ${this.player.mediaCover.width}px;
            min-height: ${this.player.mediaCover.height}px;
        `;
        super._buildPlayerUI();
        switch (this.layout) {
            case 1: this._labelOnCover(); break;
            case 2: this._labelOnCover(false); break;
            case 3: this._full(); break;
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
            text: 'Nothing Playing'
        }))
    }
});

const LinkButton = GObject.registerClass(
class LinkButton extends St.Button{
    _init(name, link, parentDialog){
        super._init({
            child: new St.Icon({
                gicon: Gio.icon_new_for_string(
                    Me.dir.get_path() + '/media/'+name+'-symbolic.svg'
                ),
            }),
            style_class: 'events-button',
            x_expand: true,
            can_focus: true,
        });
        this.connect('clicked', () => {
            Util.spawnCommandLine('xdg-open '+link);
            parentDialog.close();
        });
        this.add_style_class_name(name+'-btn');
    }
});

var LinksBox = GObject.registerClass(
class LinksBox extends St.BoxLayout{
    _init(settings, parentDialog, vertical = false){
        super._init({
            style_class: 'container',
            x_expand: true,
            y_expand: true,
            reactive: true,
        });
        if(vertical) this.vertical = true;
        let names = settings.get_strv('dash-link-names');
        let urls = settings.get_strv('dash-link-urls');

        this.links = [];

        for (let i = 0; i < urls.length; i++) {
            if(names[i] !== undefined){
                this.links.push(new LinkButton(names[i], urls[i], parentDialog));
            }else{
                this.links.push(new LinkButton('none', urls[i], parentDialog));
            }
        }

        this.links.forEach(ch => this.add_child(ch) );
    }
});

var ClockBox = GObject.registerClass(
class ClockBox extends St.BoxLayout{
    _init(vertical){
        super._init({
            style_class: 'events-button',
            x_expand: true,
            reactive: true,
        });
        this.clock = new St.Label({
            style_class: 'clock',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });
        this.date = new St.Label({
            style_class: 'date',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });
        this.day = new St.Label({
            style_class: 'day',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });

        let vbox = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        vbox.add_child(this.day);
        vbox.add_child(this.date);
        this.add_child(this.clock);
        this.add_child(vbox);
        if(vertical) this.vertical = true;
        if(vertical) vbox.style = 'text-align: center';

        this.wallclock = new GnomeDesktop.WallClock({ time_only: true });
        this.wallclock.connectObject(
            'notify::clock',
            () => this.updateClock(), this);

        this.connect('destroy', () => {
            this.wallclock.disconnectObject(this);
            this.wallclock = null;
        });
    
        this.updateClock();
    }
    updateClock(){
        //b - short month; m - month num; d- day num; A - day name;
        this.clock.text = GLib.DateTime.new_now_local().format('%H:%M ');
        this.date.text = GLib.DateTime.new_now_local().format('%Y. %m. %d.');
        this.day.text = GLib.DateTime.new_now_local().format('%A');
    }
});

const AppBtn = GObject.registerClass(
class AppBtn extends Dash.DashIcon{
    _init(app, parentDialog, settings, pos){
        super._init(app);

        this.app = app;
        this.pos = pos;
        this.settings = settings;

        this.connect('clicked', () => {
            parentDialog.close();
        });

        this._changeIconSize();
        this.settings.connect('changed::dash-app-icon-size', this._changeIconSize.bind(this));
    }

    _changeIconSize(){
        this.icon.setIconSize(this.settings.get_int('dash-app-icon-size'));
    }

    acceptDrop(source){
        AppFavorites.getAppFavorites().moveFavoriteToPos(
            source.app.get_id(),
            this.pos
        )
    }
});

var AppBox = GObject.registerClass(
class AppBox extends St.BoxLayout{
    _init(settings, parentDialog){
        super._init({
            vertical: true,
            style_class: 'events-button container',
            y_expand: true,
            x_expand: true,
            reactive: true,
        });

        this.settings = settings;
        this.parentDialog = parentDialog;

        this.settings.connect('changed::dash-apps-rows', this._reload.bind(this));
        this.settings.connect('changed::dash-apps-cols', this._reload.bind(this));
        AppFavorites.getAppFavorites().connectObject('changed', this._reload.bind(this), this);
        this._reload();
        
        this.connect('destroy', this._onDestroy.bind(this));
    }

    _reload(){
        this.rows = [];
        this.remove_all_children();
        this._buildUI();
    }

    _buildUI(){
        let rows = this.settings.get_int('dash-apps-rows');
        let cols = this.settings.get_int('dash-apps-cols');

        let favs = AppFavorites.getAppFavorites().getFavorites();
        for (let i = 0; i < rows; i++) {
            let row = new St.BoxLayout({
                style_class: 'container',
                y_expand: true,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
            });
            this.rows.push(row);
            this.add_child(row);
        }
        let k = 0;
        for (let i = 0; i < favs.length; i++) {
            if(i !== 0 && i%cols === 0) k++;
            if(this.rows[k]){
                this.rows[k].add_child(new AppBtn(favs[i], this.parentDialog, this.settings, i));
            }else{
                return;
            }
        }
    }

    _onDestroy(){
        AppFavorites.getAppFavorites().disconnectObject(this);
        this.settings = null;
    }
});

const SysBtn = GObject.registerClass(
class SysBtn extends St.Button{
    _init(icon, callback, iconSize, parentDialog){
        super._init({
            style_class: 'popup-menu-item',
            child: new St.Icon({
                icon_name: icon,
                icon_size: iconSize
            }),
            y_expand: true,
            x_expand: true,
            can_focus: true
        });
        this.connect('clicked', callback);
        this.connect('clicked', () => parentDialog.close());
    }
});

var SysBox = GObject.registerClass(
class SysBox extends St.BoxLayout{
    _init(vertical, iconSize, parentDialog){
        super._init({
            style_class: 'events-button container',
        });
        if(vertical) this.vertical = true;
        if(iconSize) this.iconSize = iconSize;
        else this.iconSize = 22;

        this.parentDialog = parentDialog;

        this._buildUI();
    }
    _buildUI(){
        let wifi = new SysBtn('network-wireless-signal-good-symbolic', () => Shell.AppSystem.get_default().lookup_app('gnome-wifi-panel.desktop').activate(), this.iconSize, this.parentDialog);
        let settings = new SysBtn('org.gnome.Settings-symbolic', () => Shell.AppSystem.get_default().lookup_app('org.gnome.Settings.desktop').activate(), this.iconSize, this.parentDialog);
        let bluetooth = new SysBtn('bluetooth-active-symbolic', () => Shell.AppSystem.get_default().lookup_app('gnome-bluetooth-panel.desktop').activate(), this.iconSize, this.parentDialog);

        if(this.vertical){
            this.add_child(settings);
            this.add_child(bluetooth);
            this.add_child(wifi);
        }else{
            this.add_child(wifi);
            this.add_child(bluetooth);
            this.add_child(settings);
        }
    }
});

var SysActionsBox = GObject.registerClass(
class SysActionsBox extends St.BoxLayout{
    _init(layout, iconSize, parentDialog){
        super._init({
            style_class: 'events-button container',
        });
        this.layout = layout;
        if(iconSize) this.iconSize = iconSize;

        let sysActions = SystemActions.getDefault();
        this.powerOff = new SysBtn('system-shutdown-symbolic', () => sysActions.activateAction('power-off'), this.iconSize, parentDialog);
        this.restart = new SysBtn('system-reboot-symbolic', () => sysActions.activateAction('restart'), this.iconSize, parentDialog);
        this.logout = new SysBtn('system-log-out-symbolic', () => sysActions.activateAction('logout'), this.iconSize, parentDialog);
        this.suspend = new SysBtn('weather-clear-night-symbolic', () => sysActions.activateAction('suspend'), this.iconSize, parentDialog);

        this._buildUI();
    }
    _buildUI(){
        switch (this.layout) {
            case 0:
                this.rowLayout(); break;
            case 1:
                this.colLayout(); break;
            case 2:
                this.boxLayout(); break;
            default:
                this.boxLayout(); break;
        }
    }
    rowLayout(){
        this.add_child(this.suspend);
        this.add_child(this.logout);
        this.add_child(this.restart);
        this.add_child(this.powerOff);
    }
    colLayout(){
        this.vertical = true;
        this.add_child(this.powerOff);
        this.add_child(this.restart);
        this.add_child(this.logout);
        this.add_child(this.suspend);
    }
    boxLayout(){
        this.vertical = true;
        let row1 = new St.BoxLayout({
            style_class: 'db-container',
            x_expand: true,
            y_expand: true
        });
        let row2 = new St.BoxLayout({
            style_class: 'db-container',
            x_expand: true,
            y_expand: true
        });
        row1.add_child(this.logout);
        row1.add_child(this.powerOff);
        row2.add_child(this.suspend);
        row2.add_child(this.restart);
        this.add_child(row1);
        this.add_child(row2);
    }
});
