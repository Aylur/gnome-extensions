//GNOME 42 js/ui/status/network;
const { Clutter, Gio, GLib, GObject, Meta, NM, St } = imports.gi;
const Signals = imports.signals;
const Animation = imports.ui.animation;
const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
const Rfkill = imports.ui.status.rfkill;
const Util = imports.misc.util;

// Gio._promisify(Gio.DBusConnection.prototype, 'call');
// Gio._promisify(NM.Client, 'new_async');
// Gio._promisify(NM.Client.prototype, 'check_connectivity_async');

const NMAccessPointSecurity = {
    NONE: 1,
    WEP: 2,
    WPA_PSK: 3,
    WPA2_PSK: 4,
    WPA_ENT: 5,
    WPA2_ENT: 6,
};

const NM80211Mode = NM['80211Mode'];
const NM80211ApFlags = NM['80211ApFlags'];
const NM80211ApSecurityFlags = NM['80211ApSecurityFlags'];

function signalToIcon(value) {
    if (value < 20)
        return 'none';
    else if (value < 40)
        return 'weak';
    else if (value < 50)
        return 'ok';
    else if (value < 80)
        return 'good';
    else
        return 'excellent';
}

function ssidToLabel(ssid) {
    let label = NM.utils_ssid_to_utf8(ssid.get_data());
    if (!label)
        label = _("<unknown>");
    return label;
}

function launchSettingsPanel(panel, ...args) {
    const param = new GLib.Variant('(sav)',
        [panel, args.map(s => new GLib.Variant('s', s))]);
    const platformData = {
        'desktop-startup-id': new GLib.Variant('s',
            `_TIME${global.get_current_time()}`),
    };
    try {
        Gio.DBus.session.call(
            'org.gnome.Settings',
            '/org/gnome/Settings',
            'org.freedesktop.Application',
            'ActivateAction',
            new GLib.Variant('(sava{sv})',
                ['launch-panel', [param], platformData]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null);
    } catch (e) {
        log(`Failed to launch Settings panel: ${e.message}`);
    }
}

var NMWirelessDialogItem = GObject.registerClass({
    Signals: {
        'selected': {},
    },
}, class NMWirelessDialogItem extends St.BoxLayout {
    _init(network) {
        this._network = network;
        this._ap = network.accessPoints[0];

        super._init({
            style_class: 'nm-dialog-item',
            can_focus: true,
            reactive: true,
        });

        let action = new Clutter.ClickAction();
        action.connect('clicked', () => this.grab_key_focus());
        this.add_action(action);

        let title = ssidToLabel(this._ap.get_ssid());
        this._label = new St.Label({
            text: title,
            x_expand: true,
        });

        this.label_actor = this._label;
        this.add_child(this._label);

        this._selectedIcon = new St.Icon({
            style_class: 'nm-dialog-icon nm-dialog-network-selected',
            icon_name: 'object-select-symbolic',
        });
        this.add(this._selectedIcon);

        this._icons = new St.BoxLayout({
            style_class: 'nm-dialog-icons',
            x_align: Clutter.ActorAlign.END,
        });
        this.add_child(this._icons);

        this._secureIcon = new St.Icon({ style_class: 'nm-dialog-icon' });
        if (this._ap._secType != NMAccessPointSecurity.NONE)
            this._secureIcon.icon_name = 'network-wireless-encrypted-symbolic';
        this._icons.add_actor(this._secureIcon);

        this._signalIcon = new St.Icon({ style_class: 'nm-dialog-icon' });
        this._icons.add_actor(this._signalIcon);

        this._sync();
    }

    vfunc_key_focus_in() {
        this.emit('selected');
    }

    _sync() {
        this._signalIcon.icon_name = this._getSignalIcon();
    }

    updateBestAP(ap) {
        this._ap = ap;
        this._sync();
    }

    setActive(isActive) {
        this._selectedIcon.opacity = isActive ? 255 : 0;
    }

    _getSignalIcon() {
        if (this._ap.mode === NM80211Mode.ADHOC)
            return 'network-workgroup-symbolic';
        else
            return `network-wireless-signal-${signalToIcon(this._ap.strength)}-symbolic`;
    }
});

var NMWirelessDialog = GObject.registerClass(
class NMWirelessDialog extends ModalDialog.ModalDialog {
    _init(client, device) {
        super._init({ styleClass: 'nm-dialog' });

        this._client = client;
        this._device = device;

        this._client.connectObject('notify::wireless-enabled',
            this._syncView.bind(this), this);

        this._rfkill = Rfkill.getRfkillManager();
        this._rfkill.connectObject('airplane-mode-changed',
            this._syncView.bind(this), this);

        this._networks = [];
        this._buildLayout();

        let connections = client.get_connections();
        this._connections = connections.filter(
            connection => device.connection_valid(connection));

        device.connectObject(
            'access-point-added', this._accessPointAdded.bind(this),
            'access-point-removed', this._accessPointRemoved.bind(this),
            'notify::active-access-point', this._activeApChanged.bind(this), this);

        // accessPointAdded will also create dialog items
        let accessPoints = device.get_access_points() || [];
        accessPoints.forEach(ap => {
            this._accessPointAdded(this._device, ap);
        });

        this._selectedNetwork = null;
        this._activeApChanged();
        this._updateSensitivity();
        this._syncView();

        this._scanTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 15, this._onScanTimeout.bind(this));
        GLib.Source.set_name_by_id(this._scanTimeoutId, '[gnome-shell] this._onScanTimeout');
        this._onScanTimeout();

        let id = Main.sessionMode.connect('updated', () => {
            if (Main.sessionMode.allowSettings)
                return;

            Main.sessionMode.disconnect(id);
            this.close();
        });

        this.connect('destroy', this._onDestroy.bind(this));
    }

    _onDestroy() {
        if (this._scanTimeoutId) {
            GLib.source_remove(this._scanTimeoutId);
            this._scanTimeoutId = 0;
        }

        if (this._syncVisibilityId) {
            Meta.later_remove(this._syncVisibilityId);
            this._syncVisibilityId = 0;
        }
    }

    _onScanTimeout() {
        this._device.request_scan_async(null, null);
        return GLib.SOURCE_CONTINUE;
    }

    _activeApChanged() {
        if (this._activeNetwork)
            this._activeNetwork.item.setActive(false);

        this._activeNetwork = null;
        if (this._device.active_access_point) {
            let idx = this._findNetwork(this._device.active_access_point);
            if (idx >= 0)
                this._activeNetwork = this._networks[idx];
        }

        if (this._activeNetwork)
            this._activeNetwork.item.setActive(true);
        this._updateSensitivity();
    }

    _updateSensitivity() {
        let connectSensitive = this._client.wireless_enabled && this._selectedNetwork && (this._selectedNetwork != this._activeNetwork);
        this._connectButton.reactive = connectSensitive;
        this._connectButton.can_focus = connectSensitive;
    }

    _syncView() {
        if (this._rfkill.airplaneMode) {
            this._airplaneBox.show();

            this._airplaneIcon.icon_name = 'airplane-mode-symbolic';
            this._airplaneHeadline.text = _("Airplane Mode is On");
            this._airplaneText.text = _("Wi-Fi is disabled when airplane mode is on.");
            this._airplaneButton.label = _("Turn Off Airplane Mode");

            this._airplaneButton.visible = !this._rfkill.hwAirplaneMode;
            this._airplaneInactive.visible = this._rfkill.hwAirplaneMode;
            this._noNetworksBox.hide();
        } else if (!this._client.wireless_enabled) {
            this._airplaneBox.show();

            this._airplaneIcon.icon_name = 'dialog-information-symbolic';
            this._airplaneHeadline.text = _("Wi-Fi is Off");
            this._airplaneText.text = _("Wi-Fi needs to be turned on in order to connect to a network.");
            this._airplaneButton.label = _("Turn On Wi-Fi");

            this._airplaneButton.show();
            this._airplaneInactive.hide();
            this._noNetworksBox.hide();
        } else {
            this._airplaneBox.hide();

            this._noNetworksBox.visible = this._networks.length == 0;
        }

        if (this._noNetworksBox.visible)
            this._noNetworksSpinner.play();
        else
            this._noNetworksSpinner.stop();
    }

    _buildLayout() {
        let headline = new St.BoxLayout({ style_class: 'nm-dialog-header-hbox' });

        const icon = new St.Icon({
            style_class: 'nm-dialog-header-icon',
            icon_name: 'network-wireless-symbolic',
        });

        let titleBox = new St.BoxLayout({ vertical: true });
        const title = new St.Label({
            style_class: 'nm-dialog-header',
            text: _('Wi-Fi Networks'),
        });
        const subtitle = new St.Label({
            style_class: 'nm-dialog-subheader',
            text: _('Select a network'),
        });
        titleBox.add(title);
        titleBox.add(subtitle);

        headline.add(icon);
        headline.add(titleBox);

        this.contentLayout.style_class = 'nm-dialog-content';
        this.contentLayout.add(headline);

        this._stack = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            y_expand: true,
        });

        this._itemBox = new St.BoxLayout({ vertical: true });
        this._scrollView = new St.ScrollView({ style_class: 'nm-dialog-scroll-view' });
        this._scrollView.set_x_expand(true);
        this._scrollView.set_y_expand(true);
        this._scrollView.set_policy(St.PolicyType.NEVER,
                                    St.PolicyType.AUTOMATIC);
        this._scrollView.add_actor(this._itemBox);
        this._stack.add_child(this._scrollView);

        this._noNetworksBox = new St.BoxLayout({
            vertical: true,
            style_class: 'no-networks-box',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._noNetworksSpinner = new Animation.Spinner(16);
        this._noNetworksBox.add_actor(this._noNetworksSpinner);
        this._noNetworksBox.add_actor(new St.Label({
            style_class: 'no-networks-label',
            text: _('No Networks'),
        }));
        this._stack.add_child(this._noNetworksBox);

        this._airplaneBox = new St.BoxLayout({
            vertical: true,
            style_class: 'nm-dialog-airplane-box',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._airplaneIcon = new St.Icon({ icon_size: 48 });
        this._airplaneHeadline = new St.Label({ style_class: 'nm-dialog-airplane-headline headline' });
        this._airplaneText = new St.Label({ style_class: 'nm-dialog-airplane-text' });

        let airplaneSubStack = new St.Widget({ layout_manager: new Clutter.BinLayout() });
        this._airplaneButton = new St.Button({ style_class: 'modal-dialog-button button' });
        this._airplaneButton.connect('clicked', () => {
            if (this._rfkill.airplaneMode)
                this._rfkill.airplaneMode = false;
            else
                this._client.wireless_enabled = true;
        });
        airplaneSubStack.add_actor(this._airplaneButton);
        this._airplaneInactive = new St.Label({
            style_class: 'nm-dialog-airplane-text',
            text: _('Use hardware switch to turn off'),
        });
        airplaneSubStack.add_actor(this._airplaneInactive);

        this._airplaneBox.add_child(this._airplaneIcon);
        this._airplaneBox.add_child(this._airplaneHeadline);
        this._airplaneBox.add_child(this._airplaneText);
        this._airplaneBox.add_child(airplaneSubStack);
        this._stack.add_child(this._airplaneBox);

        this.contentLayout.add_child(this._stack);

        this._disconnectButton = this.addButton({
            action: () => this.close(),
            label: _('Cancel'),
            key: Clutter.KEY_Escape,
        });
        this._connectButton = this.addButton({
            action: this._connect.bind(this),
            label: _('Connect'),
            key: Clutter.KEY_Return,
        });
    }

    _connect() {
        let network = this._selectedNetwork;
        if (network.connections.length > 0) {
            let connection = network.connections[0];
            this._client.activate_connection_async(connection, this._device, null, null, null);
        } else {
            let accessPoints = network.accessPoints;
            if ((accessPoints[0]._secType == NMAccessPointSecurity.WPA2_ENT) ||
                (accessPoints[0]._secType == NMAccessPointSecurity.WPA_ENT)) {
                // 802.1x-enabled APs require further configuration, so they're
                // handled in gnome-control-center
                launchSettingsPanel('wifi', 'connect-8021x-wifi',
                    this._getDeviceDBusPath(), accessPoints[0].get_path());
            } else {
                let connection = new NM.SimpleConnection();
                this._client.add_and_activate_connection_async(connection, this._device, accessPoints[0].get_path(), null, null);
            }
        }

        this.close();
    }

    _getDeviceDBusPath() {
        // nm_object_get_path() is shadowed by nm_device_get_path()
        return NM.Object.prototype.get_path.call(this._device);
    }

    _notifySsidCb(accessPoint) {
        if (accessPoint.get_ssid() != null) {
            accessPoint.disconnectObject(this);
            this._accessPointAdded(this._device, accessPoint);
        }
    }

    _getApSecurityType(accessPoint) {
        if (accessPoint._secType)
            return accessPoint._secType;

        let flags = accessPoint.flags;
        let wpaFlags = accessPoint.wpa_flags;
        let rsnFlags = accessPoint.rsn_flags;
        let type;
        if (rsnFlags != NM80211ApSecurityFlags.NONE) {
            /* RSN check first so that WPA+WPA2 APs are treated as RSN/WPA2 */
            if (rsnFlags & NM80211ApSecurityFlags.KEY_MGMT_802_1X)
                type = NMAccessPointSecurity.WPA2_ENT;
            else if (rsnFlags & NM80211ApSecurityFlags.KEY_MGMT_PSK)
                type = NMAccessPointSecurity.WPA2_PSK;
        } else if (wpaFlags != NM80211ApSecurityFlags.NONE) {
            if (wpaFlags & NM80211ApSecurityFlags.KEY_MGMT_802_1X)
                type = NMAccessPointSecurity.WPA_ENT;
            else if (wpaFlags & NM80211ApSecurityFlags.KEY_MGMT_PSK)
                type = NMAccessPointSecurity.WPA_PSK;
        } else {
            // eslint-disable-next-line no-lonely-if
            if (flags & NM80211ApFlags.PRIVACY)
                type = NMAccessPointSecurity.WEP;
            else
                type = NMAccessPointSecurity.NONE;
        }

        // cache the found value to avoid checking flags all the time
        accessPoint._secType = type;
        return type;
    }

    _networkSortFunction(one, two) {
        let oneHasConnection = one.connections.length != 0;
        let twoHasConnection = two.connections.length != 0;

        // place known connections first
        // (-1 = good order, 1 = wrong order)
        if (oneHasConnection && !twoHasConnection)
            return -1;
        else if (!oneHasConnection && twoHasConnection)
            return 1;

        let oneAp = one.accessPoints[0] || null;
        let twoAp = two.accessPoints[0] || null;

        if (oneAp != null && twoAp == null)
            return -1;
        else if (oneAp == null && twoAp != null)
            return 1;

        let oneStrength = oneAp.strength;
        let twoStrength = twoAp.strength;

        // place stronger connections first
        if (oneStrength != twoStrength)
            return oneStrength < twoStrength ? 1 : -1;

        let oneHasSecurity = one.security != NMAccessPointSecurity.NONE;
        let twoHasSecurity = two.security != NMAccessPointSecurity.NONE;

        // place secure connections first
        // (we treat WEP/WPA/WPA2 the same as there is no way to
        // take them apart from the UI)
        if (oneHasSecurity && !twoHasSecurity)
            return -1;
        else if (!oneHasSecurity && twoHasSecurity)
            return 1;

        // sort alphabetically
        return GLib.utf8_collate(one.ssidText, two.ssidText);
    }

    _networkCompare(network, accessPoint) {
        if (!network.ssid.equal(accessPoint.get_ssid()))
            return false;
        if (network.mode != accessPoint.mode)
            return false;
        if (network.security != this._getApSecurityType(accessPoint))
            return false;

        return true;
    }

    _findExistingNetwork(accessPoint) {
        for (let i = 0; i < this._networks.length; i++) {
            let network = this._networks[i];
            for (let j = 0; j < network.accessPoints.length; j++) {
                if (network.accessPoints[j] == accessPoint)
                    return { network: i, ap: j };
            }
        }

        return null;
    }

    _findNetwork(accessPoint) {
        if (accessPoint.get_ssid() == null)
            return -1;

        for (let i = 0; i < this._networks.length; i++) {
            if (this._networkCompare(this._networks[i], accessPoint))
                return i;
        }
        return -1;
    }

    _checkConnections(network, accessPoint) {
        this._connections.forEach(connection => {
            if (accessPoint.connection_valid(connection) &&
                !network.connections.includes(connection))
                network.connections.push(connection);
        });
    }

    _accessPointAdded(device, accessPoint) {
        if (accessPoint.get_ssid() == null) {
            // This access point is not visible yet
            // Wait for it to get a ssid
            accessPoint.connectObject('notify::ssid',
                this._notifySsidCb.bind(this), this);
            return;
        }

        let pos = this._findNetwork(accessPoint);
        let network;

        if (pos != -1) {
            network = this._networks[pos];
            if (network.accessPoints.includes(accessPoint)) {
                log('Access point was already seen, not adding again');
                return;
            }

            Util.insertSorted(network.accessPoints, accessPoint, (one, two) => {
                return two.strength - one.strength;
            });
            network.item.updateBestAP(network.accessPoints[0]);
            this._checkConnections(network, accessPoint);

            this._resortItems();
        } else {
            network = {
                ssid: accessPoint.get_ssid(),
                mode: accessPoint.mode,
                security: this._getApSecurityType(accessPoint),
                connections: [],
                item: null,
                accessPoints: [accessPoint],
            };
            network.ssidText = ssidToLabel(network.ssid);
            this._checkConnections(network, accessPoint);

            let newPos = Util.insertSorted(this._networks, network, this._networkSortFunction);
            this._createNetworkItem(network);
            this._itemBox.insert_child_at_index(network.item, newPos);
        }

        this._queueSyncItemVisibility();
        this._syncView();
    }

    _queueSyncItemVisibility() {
        if (this._syncVisibilityId)
            return;

        this._syncVisibilityId = Meta.later_add(
            Meta.LaterType.BEFORE_REDRAW,
            () => {
                const { hasWindows } = Main.sessionMode;
                const { WPA2_ENT, WPA_ENT } = NMAccessPointSecurity;

                for (const network of this._networks) {
                    const [firstAp] = network.accessPoints;
                    network.item.visible =
                        hasWindows ||
                        network.connections.length > 0 ||
                        (firstAp._secType !== WPA2_ENT && firstAp._secType !== WPA_ENT);
                }
                this._syncVisibilityId = 0;
                return GLib.SOURCE_REMOVE;
            });
    }

    _accessPointRemoved(device, accessPoint) {
        let res = this._findExistingNetwork(accessPoint);

        if (res == null) {
            log('Removing an access point that was never added');
            return;
        }

        let network = this._networks[res.network];
        network.accessPoints.splice(res.ap, 1);

        if (network.accessPoints.length == 0) {
            network.item.destroy();
            this._networks.splice(res.network, 1);
        } else {
            network.item.updateBestAP(network.accessPoints[0]);
            this._resortItems();
        }

        this._syncView();
    }

    _resortItems() {
        let adjustment = this._scrollView.vscroll.adjustment;
        let scrollValue = adjustment.value;

        this._itemBox.remove_all_children();
        this._networks.forEach(network => {
            this._itemBox.add_child(network.item);
        });

        adjustment.value = scrollValue;
    }

    _selectNetwork(network) {
        if (this._selectedNetwork)
            this._selectedNetwork.item.remove_style_pseudo_class('selected');

        this._selectedNetwork = network;
        this._updateSensitivity();

        if (this._selectedNetwork)
            this._selectedNetwork.item.add_style_pseudo_class('selected');
    }

    _createNetworkItem(network) {
        network.item = new NMWirelessDialogItem(network);
        network.item.setActive(network == this._selectedNetwork);
        network.item.hide();
        network.item.connect('selected', () => {
            Util.ensureActorVisibleInScrollView(this._scrollView, network.item);
            this._selectNetwork(network);
        });
        network.item.connect('destroy', () => {
            let keyFocus = global.stage.key_focus;
            if (keyFocus && keyFocus.contains(network.item))
                this._itemBox.grab_key_focus();
        });
    }
});