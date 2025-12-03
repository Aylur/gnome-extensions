# Gnome Auto Always on Top

Make newly opened windows automatically "Always on Top"

## Installation

```sh
# get the latest tag
tag=$(curl -s https://api.github.com/repos/aylur/gnome-extensions/releases/latest | jq -r .tag_name)

# download the extension
curl -L "https://github.com/Aylur/gnome-extensions/releases/download/$tag/auto-always-on-top@aylur.shell-extension.zip" -o auto-always-on-top@aylur.shell-extension.zip

# install
gnome-extensions install auto-always-on-top@aylur.shell-extension.zip

# log out and log in
gnome-session-quit
```
