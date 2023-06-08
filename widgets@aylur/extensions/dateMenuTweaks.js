/* exported Extension */

const {St, GObject, Clutter, Pango, GLib, GnomeDesktop, Shell} = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const DateMenu = Main.panel.statusArea.dateMenu;
const Media = Me.imports.shared.media;
const {Avatar} = Me.imports.shared.userWidget;
const SystemLevels = Me.imports.shared.systemLevels;

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

const LevelsBox = GObject.registerClass(
class LevelsBox extends SystemLevels.LevelsBox {
    _init(settings) {
        super._init(settings, 'date-menu-levels-show');
        this.add_style_class_name('events-button');
        this.add_style_class_name('datemenu-levels');

        const bind = DateMenu.menu.connect('open-state-changed', (_self, open) => {
            if (open)
                this.startTimeout();
            else
                this.stopTimeout();
        });

        this.updateLevels();
        this.connect('destroy', () => DateMenu.menu.disconnect(bind));
    }
});

const MediaBox = GObject.registerClass(
class MediaBox extends Media.MediaBox {
    _init(settings) {
        super._init(settings, 'date-menu-media');
        this.add_style_class_name('events-button');
    }

    _buildPlayerUI() {
        this.style = '';
        super._buildPlayerUI();
        switch (this.layout) {
        case 1: this._labelOnCover(); break;
        case 2: this._labelOnCover(false); break;
        case 3: this._full(); break;
        default: this._normal(); break;
        }
    }

    _full() {
        super._full();
        if (!this.showVolume) {
            this.style = `
                border-radius: ${this.coverRadius}px;
                padding: 0;
                border: none;
            `;
        }
    }
});

const CustomMenu = GObject.registerClass(
class CustomMenu extends St.BoxLayout {
    _init(settings) {
        super._init({
            vertical: true,
            style_class: 'datemenu-menu-custom-box',
        });

        const datemenu = new imports.ui.dateMenu.DateMenuButton();

        const calendar = datemenu._calendar;
        const eventsItem = datemenu._eventsItem;
        const clocksItem = datemenu._clocksItem;
        const weatherItem = datemenu._weatherItem;

        calendar.get_parent().remove_child(calendar);
        eventsItem.get_parent().remove_child(eventsItem);
        clocksItem.get_parent().remove_child(clocksItem);
        weatherItem.get_parent().remove_child(weatherItem);

        // userIcon
        const userBtn = new St.Button({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'events-button',
            child: Avatar({fallbackSize: 82}),
        });
        userBtn.connect('clicked', () => Shell.AppSystem.get_default()
            .lookup_app('gnome-user-accounts-panel.desktop').activate());

        const userName = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            text: GLib.get_user_name(),
            style_class: 'datemenu-user-name',
        });

        this.greet = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'datemenu-greet',
        });

        const userBox = new St.BoxLayout({
            vertical: true,
            style_class: 'datemenu-user',
        });
        userBox.add_child(userBtn);
        userBox.add_child(userName);
        userBox.add_child(this.greet);

        // calendar
        const calendarBox = new St.Bin({
            x_expand: true,
            style_class: 'events-button',
        });
        calendarBox.set_child(calendar);
        calendar.x_expand = true;
        calendar.x_align = Clutter.ActorAlign.CENTER;

        // UI
        const scrollView = new St.ScrollView({
            style_class: 'vfade',
            x_expand: true,
            overlay_scrollbars: false,
            enable_mouse_scrolling: true,
        });
        scrollView.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);

        const scrollItems = new St.BoxLayout({
            vertical: true,
        });
        scrollView.add_actor(scrollItems);

        if (settings.get_boolean('date-menu-show-user'))
            this.add_child(userBox);

        this.add_child(calendarBox);

        if (settings.get_boolean('date-menu-show-events'))
            scrollItems.add_child(eventsItem);
        if (settings.get_boolean('date-menu-show-clocks'))
            scrollItems.add_child(clocksItem);
        if (settings.get_boolean('date-menu-show-weather'))
            scrollItems.add_child(weatherItem);
        if (settings.get_boolean('date-menu-show-media'))
            scrollItems.add_child(new MediaBox(settings));
        if (settings.get_boolean('date-menu-show-system-levels'))
            scrollItems.add_child(new LevelsBox(settings));


        this.add_child(scrollView);

        DateMenu.menu.connectObject('open-state-changed', (_menu, isOpen) => {
            if (!isOpen)
                return;
            const now = new Date();
            calendar.setDate(now);
            eventsItem.setDate(now);
            this._setGreet();
        }, this);

        Main.layoutManager.connectObject('monitors-changed', () => this.tweaks.reload(), this);
        this.connect('destroy', this._onDestroy.bind(this));
    }

    _onDestroy() {
        DateMenu.menu.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);
    }

    _updateHeight() {
        const height = Main.layoutManager.primaryMonitor.height - Main.panel.height;
        this.style = `max-height: ${height - 14}px;`;
    }

    stopTimeout() {
        if (this.levels)
            this.levels.stopTimeout();
    }

    startTimeout() {
        if (this.levels)
            this.levels.startTimeout();
    }

    _setGreet() {
        const time = new Date();
        const hour = time.getHours();

        let greet = _('Good Evening!');
        if (hour > 6)
            greet = _('Good Morning!');

        if (hour > 12)
            greet = _('Good Afternoon!');
        if (hour > 18)
            greet = _('Good Evening!');

        this.greet.text = greet;
    }

    _buildPlayerUI() {
        const elements = this.player;

        elements.mediaCover.x_align = Clutter.ActorAlign.CENTER;
        elements.mediaCover.y_expand = true;
        elements.mediaCover.height = 220;
        elements.mediaCover.width = 220;
        elements.controlsBox.vertical = true;
        elements.controlsBox.y_align = Clutter.ActorAlign.CENTER;
        elements.titleBox.vertical = false;
        elements.titleBox.x_expand = true;
        elements.titleBox.insert_child_at_index(new St.Label({text: ' - '}), 1);
        elements.titleBox.insert_child_at_index(new St.Widget({x_expand: true}), 0);
        elements.titleBox.insert_child_at_index(new St.Widget({x_expand: true}), 4);
        elements.titleBox.width = elements.mediaCover.width + elements.controlsBox.width;

        const hbox = new St.BoxLayout({style_class: 'media-container'});
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
    constructor(settings) {
        this._settings = settings;
        this._panelBox = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox,
        ];
        this._box = DateMenu.get_first_child();
        this._padding = this._box.get_first_child();
        this._indicator = DateMenu._indicator;
        this._dateLabel = DateMenu._clockDisplay;
        this._children = this._box.get_children();

        this._menuBox = DateMenu.menu.box.get_first_child().get_first_child();
        this._calendar = this._menuBox.get_last_child();
        this._notifications = this._menuBox.get_first_child();
        this._menuChildren = this._menuBox.get_children();

        this._stockMpris = Main.panel.statusArea.dateMenu._messageList._mediaSection;
        this._shouldShow = this._stockMpris._shouldShow;
    }

    enable() {
        DateMenu.menu.box.add_style_class_name('date-menu-tweaked');
        this._settings.connectObject(
            'changed::date-menu-position',           this._reload.bind(this),
            'changed::date-menu-offset',             this._reload.bind(this),
            'changed::date-menu-remove-padding',     this._reload.bind(this),
            'changed::date-menu-indicator-position', this._reload.bind(this),
            'changed::date-menu-mirror',             this._reload.bind(this),
            'changed::date-menu-hide-notifications', this._reload.bind(this),
            'changed::date-menu-custom-menu',        this._reload.bind(this),
            'changed::date-menu-show-events',        this._reload.bind(this),
            'changed::date-menu-show-user',          this._reload.bind(this),
            'changed::date-menu-show-clocks',        this._reload.bind(this),
            'changed::date-menu-show-weather',       this._reload.bind(this),
            'changed::date-menu-show-media',         this._reload.bind(this),
            'changed::date-menu-show-system-levels', this._reload.bind(this),
            'changed::date-menu-date-format', () => {
                this._dateFormat = this._settings.get_string('date-menu-date-format');
                this._updateClock();
            },
            this
        );
        this._dateFormat = this._settings.get_string('date-menu-date-format');
        this._customMenu = new CustomMenu(this._settings);

        this._clock = new St.Label({style_class: 'clock'});
        this._clock.clutter_text.y_align = Clutter.ActorAlign.CENTER;
        this._clock.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this._wallclock = new GnomeDesktop.WallClock({time_only: true});
        this._wallclock.connect('notify::clock', () =>  this._updateClock());
        this._updateClock();

        this._settings.connect('changed::date-menu-hide-stock-mpris', () => this._mpris());
        this._mpris();

        this._reload();
    }

    disable() {
        DateMenu.menu.box.remove_style_class_name('date-menu-tweaked');
        DateMenu.container.get_parent().remove_child(DateMenu.container);
        Main.panel._centerBox.insert_child_at_index(DateMenu.container, 0);

        this._reset();
        this._mpris(true);

        this._settings.disconnectObject(this);
        this._wallclock = null;
        this._customMenu.destroy();
        this._customMenu = null;
        this._clock.destroy();
        this._clock = null;
    }

    _updateClock() {
        this._clock.text = GLib.DateTime.new_now_local().format(this._dateFormat);
    }

    _mpris(show = false) {
        if (show || !this._settings.get_boolean('date-menu-hide-stock-mpris')) {
            this._stockMpris._shouldShow = this._shouldShow;
            this._stockMpris.visible = this._stockMpris._shouldShow();
        } else {
            this._stockMpris.visible = false;
            this._stockMpris._shouldShow = () => false;
        }
    }

    _reload() {
        this._reset();

        DateMenu.container.get_parent().remove_child(DateMenu.container);
        const position = this._settings.get_int('date-menu-position');
        const offset = this._settings.get_int('date-menu-offset');
        this._panelBox[position].insert_child_at_index(DateMenu.container, offset);

        // indicator & padding
        this._box.remove_all_children();

        const pos = this._settings.get_int('date-menu-indicator-position');
        const padding = this._settings.get_boolean('date-menu-remove-padding');

        if (pos === 0) {
            this._box.add_child(this._indicator);
            this._box.add_child(this._clock);
            if (!padding)
                this._box.add_child(this._padding);
        } else if (pos === 1) {
            if (!padding)
                this._box.add_child(this._padding);
            this._box.add_child(this._clock);
            this._box.add_child(this._indicator);
        } else {
            this._box.add_child(this._clock);
        }

        // mirror
        if (this._settings.get_boolean('date-menu-mirror')) {
            this._menuBox.remove_child(this._calendar);
            this._menuBox.insert_child_at_index(this._calendar, 0);
        }

        // custom menu
        if (this._settings.get_boolean('date-menu-custom-menu'))
            this._menuBox.replace_child(this._calendar, this._customMenu);


        // notifications
        if (this._settings.get_boolean('date-menu-hide-notifications'))
            this._menuBox.remove_child(this._notifications);
    }

    _reset() {
        // position reset
        this._box.remove_all_children();
        this._children.forEach(ch => {
            this._box.add_child(ch);
        });

        // menu reset
        this._menuBox.remove_child(this._notifications);
        this._menuBox.insert_child_at_index(this._notifications, 0);
        if (this._customMenu.get_parent())
            this._menuBox.replace_child(this._customMenu, this._calendar);
    }
};
