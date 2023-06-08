/* exported Avatar, UserName, Greetings */

const {GLib, St, AccountsService, GObject} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

var Avatar = ({radius, fallbackSize, styleClass} = {}) => {
    const icon = AccountsService.UserManager.get_default().list_users()
        .filter(user => user.user_name === GLib.get_user_name())[0].icon_file;

    const avatar = new St.Widget({
        x_expand: true,
        y_expand: true,
        style_class: styleClass || '',
        style: `
            background-image: url("${icon}");
            background-size: cover;
            ${radius ? `border-radius: ${radius}px;` : ''}
        `,
    });

    const fallback = new St.Icon({
        icon_name: 'avatar-default-symbolic',
        icon_size: fallbackSize || 64,
    });

    return icon ? avatar : fallback;
};

var UserName = GObject.registerClass(
class UserName extends St.Label {
    constructor(settings, name, props) {
        super(props);

        settings.get_boolean(`${name}-user-real-name`)
            ? this.text = GLib.get_real_name()
            : this.text = GLib.get_user_name();
    }
});

var Greetings = GObject.registerClass(
class Greetings extends St.Label {
    constructor(props) {
        super(props);

        const id = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, this._greet.bind(this));
        this.connect('destroy', () => GLib.source_remove(id));
        this._greet();
    }

    _greet() {
        const time = new Date();
        const hour = time.getHours();

        let greet = _('Good Evening!');
        if (hour > 6)
            greet = _('Good Morning!');
        if (hour > 12)
            greet = _('Good Afternoon!');
        if (hour > 18)
            greet = _('Good Evening!');

        this.text = greet;
    }
});
