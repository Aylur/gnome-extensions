const { GLib, St, AccountsService } = imports.gi;

var Avatar = ({ radius, fallbackSize, styleClass } = {}) => {
    let icon = AccountsService.UserManager.get_default().list_users()
        .filter(user => user.user_name === GLib.get_user_name())[0].icon_file;

    let avatar = new St.Widget({
        x_expand: true,
        y_expand: true,
        style_class: styleClass || '',
        style: `
            background-image: url("${icon}");
            background-size: cover;
            ${radius ? `border-radius: ${radius}px;` : ''}
        `,
    });

    let fallback = new St.Icon({
        icon_name: 'avatar-default-symbolic',
        icon_size: fallbackSize || 64,
    });

    return icon ? avatar : fallback;
}

