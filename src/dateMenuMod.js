'use strict';

const { St, GObject, Clutter, Pango, Gio, GLib, GnomeDesktop, Shell } = imports.gi; 
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const DateMenu = Main.panel.statusArea.dateMenu;
const MediaPlayer = Me.imports.mediaPlayer;
const SystemLevels = Me.imports.systemLevels;
const Mainloop = imports.mainloop;

const LevelsBox = GObject.registerClass(
class LevelsBox extends St.BoxLayout{
    _init(){
        super._init({
            style_class: 'events-button date-menu-levels',
            vertical: true,
            reactive: true
        });

        this.levels = [
            new SystemLevels.PowerLevel(),
            // new SystemLevels.DirLevel(),
            new SystemLevels.CpuLevel(),
            new SystemLevels.RamLevel(),
            new SystemLevels.TempLevel(),
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

const CustomMenu = GObject.registerClass(
class CustomMenu extends St.BoxLayout{
    _init(settings){
        super._init({
            vertical: true,
            style_class: 'datemenu-menu-box'
        });

        let datemenu = new imports.ui.dateMenu.DateMenuButton();

        let calendar = datemenu._calendar;
        let eventsItem = datemenu._eventsItem;
        let clocksItem = datemenu._clocksItem;
        let weatherItem = datemenu._weatherItem;
        
        calendar.get_parent().remove_child(calendar);
        eventsItem.get_parent().remove_child(eventsItem);
        clocksItem.get_parent().remove_child(clocksItem);
        weatherItem.get_parent().remove_child(weatherItem);

        //clock
        let clockBox = new St.BoxLayout({
            vertical: true,
            style_class: 'datemenu-date'
        });
        this.day = new St.Label({ style_class: 'day-label' });
        this.date = new St.Label({ style_class: 'date-label' });
        clockBox.add_child(this.day);
        clockBox.add_child(this.date);
        let wallclock = new GnomeDesktop.WallClock();
        wallclock.connect(
            'notify::clock',
            () =>  this.updateTexts());

        //userIcon
        let userBtn = new St.Button({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'events-button',
            child: new St.Widget({
                y_expand: true,
                x_expand: true,
                style: 'background-image: url("/var/lib/AccountsService/icons/'+ GLib.get_user_name() +'"); background-size: cover;',
            })
        });
        userBtn.connect('clicked', () => Shell.AppSystem.get_default().lookup_app('gnome-user-accounts-panel.desktop').activate());

        let userName = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            text: GLib.get_user_name()
        });

        this.greet = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
        });

        let userBox = new St.BoxLayout({
            vertical: true,
            style_class: 'datemenu-user'
        });
        userBox.add_child(userBtn);
        userBox.add_child(userName);
        userBox.add_child(this.greet);

        //calendar
        let calendarBox = new St.Bin({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'events-button'
        });
        calendarBox.set_child(calendar);

        //UI
        let scrollView = new St.ScrollView({
            x_expand: true,
            overlay_scrollbars: false,
            enable_mouse_scrolling: true,
        });
        scrollView.set_policy(St.PolicyType.NEVER, St.PolicyType.NEVER);

        let scrollItems = new St.BoxLayout({
            vertical: true,
        });
        scrollView.add_actor(scrollItems);

        if(!settings.get_boolean('date-menu-hide-user'))
            this.add_child(userBox);

        this.add_child(calendarBox);

        if(!settings.get_boolean('date-menu-hide-events'))
            scrollItems.add_child(eventsItem);
        if(!settings.get_boolean('date-menu-hide-clocks'))
            scrollItems.add_child(clocksItem);
        if(!settings.get_boolean('date-menu-hide-weather'))
            scrollItems.add_child(weatherItem);

        //media
        if(!settings.get_boolean('date-menu-hide-media')){
            this.media = new MediaPlayer.Media();
            this.media.connect('updated', () => this._syncMedia());
            this.mediaBox = new St.Bin({
                style_class: 'events-button',
            });
            this._syncMedia();

            scrollItems.add_child(this.mediaBox);
        }

        //system-levels
        if(!settings.get_boolean('date-menu-hide-system-levels')){
            this.levels = new LevelsBox();
            scrollItems.add_child(this.levels);

            let bind = DateMenu.menu.connect('open-state-changed', (self, open) => {
                if(open) this.levels.startTimeout();
                else this.levels.stopTimeout();
            });
            this.levels.updateLevels();

            this.connect('destroy', () => {
                this.levels.stopTimeout()
                DateMenu.disconnect(bind);
            });
        }

        this.add_child(scrollView);
        this.updateTexts();
    }

    stopTimeout(){ if(this.levels) this.levels.stopTimeout() }
    startTimeout(){ if(this.levels) this.levels.startTimeout() }

    updateTexts(){
        this.day.text = GLib.DateTime.new_now_local().format('%A');
        this.date.text = GLib.DateTime.new_now_local().format('%d. %m. %Y');
        this._setGreet();
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

    _syncMedia(){
        let mpris = this.media.getPlayer();
        if(mpris){
            this.mediaBox.show();

            this.player = new MediaPlayer.Player(mpris);
            this._buildPlayerUI();
            this.mediaBox.set_child(this.player);
        }else{
            this.mediaBox.hide();
        }
    }

    _buildPlayerUI(){
        let elements = this.player;

        elements.mediaCover.x_align = Clutter.ActorAlign.CENTER;
        elements.mediaCover.y_expand = true;
        elements.mediaCover.height = 200;
        elements.mediaCover.width = 200;
        elements.controlsBox.vertical = true;
        elements.controlsBox.y_align = Clutter.ActorAlign.CENTER;
        elements.titleBox.vertical = false;
        elements.titleBox.x_align = Clutter.ActorAlign.START;
        elements.titleBox.insert_child_at_index(new St.Label({ text: ' - ' }), 1);
        elements.titleBox.width = 230;

        let hbox = new St.BoxLayout({ style_class: 'media-container' });
        hbox.add_child(elements.mediaCover);
        hbox.add_child(elements.controlsBox);
        
        this.player.vertical = true;
        this.player.style_class = 'media-container';

        this.player.add_child(elements.titleBox);
        this.player.add_child(hbox);
        this.player.add_child(elements.volumeBox);
    }
});

var Extension = class Extension {
    constructor() {
        this.panel = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox
        ]
        this.dateMenu = DateMenu.get_parent();
        this.panelBox = DateMenu.get_first_child();
        this.padding = this.panelBox.get_first_child();
        this.indicator = DateMenu._indicator;
        this.dateLabel = DateMenu._clockDisplay;
        this.panelBoxChildren = this.panelBox.get_children();

        this.menuBox = DateMenu.menu.box.get_first_child().get_first_child();
        this.calendar = this.menuBox.get_last_child();
        this.notifications = this.menuBox.get_first_child();
    }

    enable() {
        this.settings = ExtensionUtils.getSettings();
        this.settings.connect('changed::date-menu-position', () => this.reload());
        this.settings.connect('changed::date-menu-offset', () => this.reload());
        this.settings.connect('changed::date-menu-remove-padding', () => this.reload());
        this.settings.connect('changed::date-menu-indicator-position', () => this.reload());
        this.settings.connect('changed::date-menu-mirror', () => this.reload());
        this.settings.connect('changed::date-menu-hide-notifications', () => this.reload());
        this.settings.connect('changed::date-menu-custom-menu', () => this.reload());
        this.settings.connect('changed::date-menu-hide-events', () => this.reload());
        this.settings.connect('changed::date-menu-hide-user', () => this.reload());
        this.settings.connect('changed::date-menu-hide-clocks', () => this.reload());
        this.settings.connect('changed::date-menu-hide-weather', () => this.reload());
        this.settings.connect('changed::date-menu-hide-media', () => this.reload());
        this.settings.connect('changed::date-menu-hide-system-levels', () => this.reload());

        this.settings.connect('changed::date-menu-date-format', () => this.updateClock());

        //clock
        this.clock = new St.Label({ style_class: 'clock' });
        this.clock.clutter_text.y_align = Clutter.ActorAlign.CENTER;
        this.clock.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        this.wallclock = new GnomeDesktop.WallClock();
        this.wallclock.connect(
            'notify::clock',
            () =>  this.updateClock());
        
        this.updateClock();
        this.reload();
    }

    disable() {
        this.reset();
        if(this.customMenu){
            this.customMenu.destroy();
            this.customMenu = null;
        }

        this.dateMenu.get_parent().remove_child(this.dateMenu);
        this.panel[1].insert_child_at_index(this.dateMenu, 0);

        this.settings = null;
        this.wallclock = null;
    }

    updateClock(){
        this.clock.text = GLib.DateTime.new_now_local().format(this.settings.get_string('date-menu-date-format'));
    }

    reload(){
        this.reset();

        this.dateMenu.get_parent().remove_child(this.dateMenu);
        this.panel[this.settings.get_int('date-menu-position')]
            .insert_child_at_index(this.dateMenu, this.settings.get_int('date-menu-offset'));

        //indicator & padding
        this.panelBox.remove_all_children();

        let pos = this.settings.get_int('date-menu-indicator-position');
        let padding = this.settings.get_boolean('date-menu-remove-padding');

        if(pos === 0){
            this.panelBox.add_child(this.indicator);
            this.panelBox.add_child(this.clock);
            if(!padding) this.panelBox.add_child(this.padding);
        }else if(pos === 1){
            if(!padding) this.panelBox.add_child(this.padding);
            this.panelBox.add_child(this.clock);
            this.panelBox.add_child(this.indicator);
        }else{
            this.panelBox.add_child(this.clock);
        }

        //mirror
        if(this.settings.get_boolean('date-menu-mirror')){
            this.menuBox.remove_all_children();
            //custom menu
            if(this.settings.get_boolean('date-menu-custom-menu')){
                this.customMenu = new CustomMenu(this.settings)
                this.menuBox.add_child(this.customMenu);
                this.menuBox.add_child(this.notifications);
            }else{
                this.menuBox.add_child(this.calendar);
                this.menuBox.add_child(this.notifications);
            }
        }else{
            //custom menu
            if(this.settings.get_boolean('date-menu-custom-menu')){
                this.menuBox.remove_all_children();
                this.customMenu = new CustomMenu(this.settings)
                this.menuBox.add_child(this.notifications);
                this.menuBox.add_child(this.customMenu);
            }
        }

        //notifications
        if(this.settings.get_boolean('date-menu-hide-notifications'))
            this.menuBox.remove_child(this.notifications);
    }

    reset(){
        //position reset
        this.panelBox.remove_all_children();
        this.panelBoxChildren.forEach(ch => {
            this.panelBox.add_child(ch);
        });

        //menu reset
        this.menuBox.remove_all_children();
        this.menuBox.add_child(this.notifications);
        this.menuBox.add_child(this.calendar);
    }
}