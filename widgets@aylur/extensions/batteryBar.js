const { GObject, St, Clutter, Gio, UPowerGlib: UPower } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension()
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const { LevelBar } = Me.imports.shared.levelBar

const { loadInterfaceXML } = imports.misc.fileUtils;
const DisplayDeviceInterface = loadInterfaceXML('org.freedesktop.UPower.Device');
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

const BatteryLevelBar = GObject.registerClass(
class BatteryLevelBar extends LevelBar{
    _init(settings){
        super._init({ timeoutDelay: 100 });
        this.y_align = Clutter.ActorAlign.CENTER;
        this._settings = settings;

        this._fillLevel.x_expand = false;
        this._fillLevel.label = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: false
        });
        this._label = new St.Label({
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER
        });

        this._fillLevel.set_child(this._fillLevel.label);
        this.add_child(this._label);

        this._settings.connectObject(
            'changed::battery-bar-show-percentage', this._updateStyle.bind(this),
            'changed::battery-bar-font-color',      this._updateStyle.bind(this),
            'changed::battery-bar-font-bg-color',   this._updateStyle.bind(this),
            'changed::battery-bar-charging-color',  this._updateStyle.bind(this),
            'changed::battery-bar-low-color',       this._updateStyle.bind(this),
            'changed::battery-bar-color',           this._updateStyle.bind(this),
            'changed::battery-bar-bg-color',        this._updateStyle.bind(this),
            'changed::battery-bar-low-threshold',   this._updateStyle.bind(this),
            'changed::battery-bar-roundness',       this._updateStyle.bind(this),
            'changed::battery-bar-width',           this._updateStyle.bind(this),
            'changed::battery-bar-height',          this._updateStyle.bind(this),
            this
        );
        this.connect('destroy', () => this._settings.disconnectObject(this) );
        this._updateStyle(false);
    }

    _updateStyle(repaint = true){
        this.width = this._settings.get_int('battery-bar-width');
        this.height = this._settings.get_int('battery-bar-height');

        this._showLabel = this._settings.get_boolean('battery-bar-show-percentage');
        this._chargingColor = this._settings.get_string('battery-bar-charging-color');
        this._lowColor = this._settings.get_string('battery-bar-low-color');
        this._color = this._settings.get_string('battery-bar-color');
        this._lowThreshold = this._settings.get_int('battery-bar-low-threshold');

        this._roundness = this._settings.get_int('battery-bar-roundness');
        this.style = `
            border-radius: ${this._roundness}px;
            color: ${this._settings.get_string('battery-bar-font-bg-color')};
            background-color: ${this._settings.get_string('battery-bar-bg-color')};
        `;

        if(repaint) this._repaint();
    }

    _repaint(){
        let label = Math.floor(this._value*100).toString() + '%';
        this._fillLevel.label.text = label;
        this._label.text = label;

        if(this._showLabel){
            if(this._value >= 0.4){
                this._fillLevel.label.show();
                this._label.hide();
            }else{
                this._fillLevel.label.hide();
                this._label.show();
            }
        }else{
            this._fillLevel.label.hide();
            this._label.hide();
        }

        this._fillLevel.style = `
            border-radius: ${this._roundness}px;
            color: ${this._settings.get_string('battery-bar-font-color')};
        `;
        if(this.charging)
            this._fillLevel.style += ` background-color: ${this._chargingColor};`;
        else if(this._value*100 <= this._lowThreshold)
            this._fillLevel.style += ` background-color: ${this._lowColor};`;
        else
            this._fillLevel.style += ` background-color: ${this._color};`;

        super._repaint();
    }
});

const BatteryBar = GObject.registerClass(
class BatteryBar extends PanelMenu.Button{
    _init(settings){
        super._init(0, 'Battery Bar', true);
        this.reactive = false;
        this.add_style_class_name('battery-bar');
        this._settings = settings;

        this._proxy = new PowerManagerProxy(
            Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org/freedesktop/UPower/devices/DisplayDevice'
        );
        this._proxy.connectObject(
            'g-properties-changed', this._sync.bind(this),
            this
        );

        this._box = new St.BoxLayout();
        this._level = new BatteryLevelBar(this._settings);
        this._icon = new St.Icon({ style_class: 'system-status-icon' });
        this._box.add_child(this._level);
        this.add_child(this._box);

        this._settings.connectObject(
            'changed::battery-bar-show-icon',    this._updateStyle.bind(this),
            'changed::battery-bar-icon-position',this._updateStyle.bind(this),
            'changed::battery-bar-padding-left', this._updateStyle.bind(this),
            'changed::battery-bar-padding-right',this._updateStyle.bind(this),
            this
        );

        this.connectObject(
            'enter-event', this._sync.bind(this),
            'destroy', this._onDestroy.bind(this),
            this
        );

        this._updateStyle();
        this._sync();
    }

    _onDestroy(){
        this._settings.disconnectObject(this);
        this._proxy.disconnectObject(this);
        this._proxy = null;
    }

    _updateStyle(){
        this._box.remove_child(this._icon);

        let iconPos = this._settings.get_int('battery-bar-icon-position');
        let showIcon = this._settings.get_boolean('battery-bar-show-icon');
        
        this._icon.visible = showIcon;
        this._box.insert_child_at_index(this._icon, iconPos);
        
        this.style = `
            padding-left:  ${this._settings.get_int('battery-bar-padding-left')}px;
            padding-right: ${this._settings.get_int('battery-bar-padding-right')}px;
        `;
    }

    _sync(){
        if(!this._proxy.IsPresent)
            return this.hide();
            
        let chargingState = this._proxy.State === UPower.DeviceState.CHARGING
            ? '-charging' : '';
        let fillLevel = 10 * Math.floor(this._proxy.Percentage / 10);
        const charged =
            this._proxy.State === UPower.DeviceState.FULLY_CHARGED ||
            (this._proxy.State === UPower.DeviceState.CHARGING && fillLevel === 100);
            
        this._icon.icon_name = charged
            ? 'battery-level-100-charged-symbolic'
            : `battery-level-${fillLevel}${chargingState}-symbolic`;
    
        this._icon.fallback_icon_name = this._proxy.IconName;
    
        this._proxy.State === UPower.DeviceState.CHARGING ||
        this._proxy.State === UPower.DeviceState.FULLY_CHARGED ?
            this._level.charging = true :
            this._level.charging = false;
            
        this._level.value = this._proxy.Percentage/100;
    }
});

var Extension = class Extension{
    constructor(settings) {
        this._settings = settings;
        this.pos = [
            'left',
            'center',
            'right'
        ];
        this.stockIndicator = Main.panel.statusArea.quickSettings._system;
    }

    enable(){
        this._settings.connectObject(
            'changed::battery-bar-position',     this._addToPanel.bind(this),
            'changed::battery-bar-offset',       this._addToPanel.bind(this),
            this                
        );
        this._addToPanel();
        this.stockIndicator.hide();
    }

    disable(){
        this._settings.disconnectObject(this);
        this._panelButton.destroy();
        this._panelButton = null;
        this.stockIndicator.show();
    }
    
    _addToPanel(){
        if(this._panelButton){
            this._panelButton.destroy();
            this._panelButton = null;
        }

        this._panelButton = new BatteryBar(this._settings);
        let pos = this._settings.get_int('battery-bar-position');
        let offset = this._settings.get_int('battery-bar-offset');
        Main.panel.addToStatusArea('Battery Bar', this._panelButton, offset, this.pos[pos]);
    }
}
