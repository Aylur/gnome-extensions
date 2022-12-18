'use strict';

const { St, GObject, Clutter, Pango, Gio, GLib, GnomeDesktop, Shell } = imports.gi; 
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const DateMenu = Main.panel.statusArea.dateMenu;
const Media = Me.imports.shared.media;
const SystemLevels = Me.imports.shared.systemLevels;
const Mainloop = imports.mainloop;

const LevelsBox = GObject.registerClass(
class LevelsBox extends SystemLevels.LevelsBox{
    _init(settings){
        super._init(settings, 'date-menu-levels-show');
        this.add_style_class_name('events-button');
        this.add_style_class_name('datemenu-levels');

        let bind = DateMenu.menu.connect('open-state-changed', (self, open) => {
            if(open) this.startTimeout();
            else this.stopTimeout();
        });

        this.updateLevels();
        this.connect('destroy', () => DateMenu.menu.disconnect(bind));
    }
});

const MediaBox = GObject.registerClass(
class MediaBox extends Media.MediaBox{
    _init(settings){
        super._init(settings, 'date-menu-media');
        this.add_style_class_name('events-button');
    }

    _buildPlayerUI(){
        this.style = '';
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
            this.style = `
                border-radius: ${this.coverRadius}px;
                padding: 0;
                border: none;
            `;
        }
    }
});

const CustomMenu = GObject.registerClass(
class CustomMenu extends St.BoxLayout{
    _init(settings){
        super._init({
            vertical: true,
            style_class: 'datemenu-menu-custom-box'
        });

        let maxHeight = Main.layoutManager.primaryMonitor.height - Main.panel.height;
        this.style = `max-height: ${maxHeight-14}px; `;

        let datemenu = new imports.ui.dateMenu.DateMenuButton();

        let calendar = datemenu._calendar;
        let eventsItem = datemenu._eventsItem;
        let clocksItem = datemenu._clocksItem;
        let weatherItem = datemenu._weatherItem;
        
        calendar.get_parent().remove_child(calendar);
        eventsItem.get_parent().remove_child(eventsItem);
        clocksItem.get_parent().remove_child(clocksItem);
        weatherItem.get_parent().remove_child(weatherItem);

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
            text: GLib.get_user_name(),
            style_class: 'datemenu-user-name'
        });

        this.greet = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'datemenu-greet'
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
            x_expand: true,
            style_class: 'events-button'
        });
        calendarBox.set_child(calendar);
        calendar.x_expand = true;
        calendar.x_align = Clutter.ActorAlign.CENTER;

        //UI
        let scrollView = new St.ScrollView({
            style_class: 'vfade',
            x_expand: true,
            overlay_scrollbars: false,
            enable_mouse_scrolling: true,
        });
        scrollView.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);

        let scrollItems = new St.BoxLayout({
            vertical: true,
        });
        scrollView.add_actor(scrollItems);

        if(settings.get_boolean('date-menu-show-user'))
            this.add_child(userBox);

        this.add_child(calendarBox);

        if(settings.get_boolean('date-menu-show-events'))
            scrollItems.add_child(eventsItem);
        if(settings.get_boolean('date-menu-show-clocks'))
            scrollItems.add_child(clocksItem);
        if(settings.get_boolean('date-menu-show-weather'))
            scrollItems.add_child(weatherItem);
        if(settings.get_boolean('date-menu-show-media'))
            scrollItems.add_child(new MediaBox(settings));
        if(settings.get_boolean('date-menu-show-system-levels'))
            scrollItems.add_child(new LevelsBox(settings));
        

        this.add_child(scrollView);

        DateMenu.menu.connectObject('open-state-changed', (menu, isOpen) => {
            if(!isOpen) return;
            let now = new Date();
            calendar.setDate(now);
            eventsItem.setDate(now);
            this._setGreet();
        }, this);

        this.connect('destroy', () => DateMenu.menu.disconnectObject(this));
    }

    stopTimeout(){ if(this.levels) this.levels.stopTimeout() }
    startTimeout(){ if(this.levels) this.levels.startTimeout() }

    _setGreet(){
        let time = new Date();
        let hour = time.getHours();

        let greet = "Good Evening!";
        if(hour > 6){ greet = "Good Morning!"; }
        if(hour > 12){greet = "Good Afternoon!";}
        if(hour > 18){greet = "Good Evening!";}

        this.greet.text = greet;
    }

    _buildPlayerUI(){
        let elements = this.player;

        elements.mediaCover.x_align = Clutter.ActorAlign.CENTER;
        elements.mediaCover.y_expand = true;
        elements.mediaCover.height = 220;
        elements.mediaCover.width = 220;
        elements.controlsBox.vertical = true;
        elements.controlsBox.y_align = Clutter.ActorAlign.CENTER;
        elements.titleBox.vertical = false;
        elements.titleBox.x_expand = true;
        elements.titleBox.insert_child_at_index(new St.Label({ text: ' - ' }), 1);
        elements.titleBox.insert_child_at_index(new St.Widget({ x_expand: true }), 0);
        elements.titleBox.insert_child_at_index(new St.Widget({ x_expand: true }), 4);
        elements.titleBox.width = elements.mediaCover.width + elements.controlsBox.width;

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
        this.menuChildren = this.menuBox.get_children();

        this.stockMpris = Main.panel.statusArea.dateMenu._messageList._mediaSection;
        this.shouldShow = this.stockMpris._shouldShow;
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
        this.settings.connect('changed::date-menu-show-events', () => this.reload());
        this.settings.connect('changed::date-menu-show-user', () => this.reload());
        this.settings.connect('changed::date-menu-show-clocks', () => this.reload());
        this.settings.connect('changed::date-menu-show-weather', () => this.reload());
        this.settings.connect('changed::date-menu-show-media', () => this.reload());
        this.settings.connect('changed::date-menu-show-system-levels', () => this.reload());

        this.settings.connect('changed::date-menu-date-format', () => {
            this.dateFormat = this.settings.get_string('date-menu-date-format');
            this.updateClock()
        });
        this.dateFormat = this.settings.get_string('date-menu-date-format');

        //clock
        this.clock = new St.Label({ style_class: 'clock' });
        this.clock.clutter_text.y_align = Clutter.ActorAlign.CENTER;
        this.clock.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        this.wallclock = new GnomeDesktop.WallClock({ time_only: true });
        this.wallclock.connect(
            'notify::clock',
            () =>  this.updateClock());
        
        this.updateClock();
        this.reload();

        //mpris
        this.settings.connect('changed::date-menu-hide-stock-mpris', () => this._mpris());
        this._mpris();
    }

    _mpris(show = false){
        if(show || !this.settings.get_boolean('date-menu-hide-stock-mpris')){
            this.stockMpris._shouldShow = this.shouldShow;
            this.stockMpris.visible = this.stockMpris._shouldShow();
        }else{
            this.stockMpris.visible = false;
            this.stockMpris._shouldShow = () => false;
        }
    }

    disable() {
        this.reset();
        this._mpris(true);

        this.dateMenu.get_parent().remove_child(this.dateMenu);
        this.panel[1].insert_child_at_index(this.dateMenu, 0);

        this.settings = null;
        this.wallclock = null;
    }

    updateClock(){
        this.clock.text = GLib.DateTime.new_now_local().format(this.dateFormat);
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
            this.menuBox.remove_child(this.calendar);
            this.menuBox.insert_child_at_index(this.calendar, 0);
        }
        
        //custom menu
        if(this.settings.get_boolean('date-menu-custom-menu')){
            this.custom = new CustomMenu(this.settings);
            this.menuBox.replace_child(this.calendar, this.custom);
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
        this.menuBox.remove_child(this.notifications);
        this.menuBox.insert_child_at_index(this.notifications, 0);
        if(this.custom){
            this.menuBox.replace_child(this.custom, this.calendar);
            this.custom = null;
        }
    }
}