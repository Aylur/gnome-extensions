const { GObject, St, Clutter, Gio, UPowerGlib: UPower } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension()
const Main = imports.ui.main;

const { loadInterfaceXML } = imports.misc.fileUtils;
const DisplayDeviceInterface = loadInterfaceXML('org.freedesktop.UPower.Device');
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

const LevelBar = GObject.registerClass(
class LevelBar extends St.Bin{
    _init(settings){
        super._init({
            y_expand: true,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.FILL,
        });
        this.background = new St.BoxLayout({
            style_class: 'level-bar',
            x_align: Clutter.ActorAlign.FILL,
        });
        this.fillLevel = new St.Bin({
            style_class: 'level-fill',
            y_expand: true,
            y_align: Clutter.ActorAlign.FILL,
            x_align: Clutter.ActorAlign.START,
        });
        this.set_child(this.background);
        this.background.add_child(this.fillLevel);

        this.fillLevel.label = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: false
        });
        this.background.label = new St.Label({
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.fillLevel.set_child(this.fillLevel.label);
        this.background.add_child(this.background.label);


        this._value = 0;
        this._settings = settings;

        settings.connectObject(
            'changed::battery-bar-show-percentage', () => this._updateStyle(),
            'changed::battery-bar-font-color', () => this._updateStyle(),
            'changed::battery-bar-font-bg-color', () => this._updateStyle(),
            'changed::battery-bar-charging-color', () => this._updateStyle(),
            'changed::battery-bar-low-color', () => this._updateStyle(),
            'changed::battery-bar-color', () => this._updateStyle(),
            'changed::battery-bar-bg-color', () => this._updateStyle(),
            'changed::battery-bar-low-threshold', () => this._updateStyle(),
            'changed::battery-bar-roundness', () => this._updateStyle(),
            'changed::battery-bar-width', () => this._updateStyle(),
            'changed::battery-bar-height', () => this._updateStyle(),
            this
        );
        this.connect('destroy', () => settings.disconnectObject(this) );
        this._updateStyle(false);
        this.background.connect('stage-views-changed', () => this.repaint());
    }

    set value(value){
        this._value = value;
        this.repaint();
    }

    _updateStyle(repaint = true){
        this.width = this._settings.get_int('battery-bar-width');
        this.background.height = this._settings.get_int('battery-bar-height');

        this.showLabel = this._settings.get_boolean('battery-bar-show-percentage');
        this.chargingColor = this._settings.get_string('battery-bar-charging-color');
        this.lowColor = this._settings.get_string('battery-bar-low-color');
        this.color = this._settings.get_string('battery-bar-color');
        this.lowThreshold = this._settings.get_int('battery-bar-low-threshold');

        this.radius = this._settings.get_int('battery-bar-roundness');
        this.background.style = `
            border-radius: ${this.radius}px;
            color: ${this._settings.get_string('battery-bar-font-bg-color')};
            background-color: ${this._settings.get_string('battery-bar-bg-color')};
        `;

        if(repaint) this.repaint();
    }

    repaint(){
        if(!this.fillLevel.has_allocation() || !this.background.has_allocation())
            return;
        
        let max = this.width;
        let zero = Math.min(this.radius*2, this.background.height);
    
        this.fillLevel.width = Math.floor( (max-zero)*this._value + zero );
    
        let label = Math.floor(this._value*100).toString() + "%";
        this.fillLevel.label.text = label;
        this.background.label.text = label;

        if(this.showLabel){
            if(this._value >= 0.4){
                this.fillLevel.label.show();
                this.background.label.hide();
            }else{
                this.fillLevel.label.hide();
                this.background.label.show();
            }
        }else{
            this.fillLevel.label.hide();
            this.background.label.hide();
        }

        if(this.charging){
            this.fillLevel.style = `
                border-radius: ${this.radius}px;
                color: ${this._settings.get_string('battery-bar-font-color')};
                background-color: ${this.chargingColor};
            `;
        }else if(this._value*100 <= this.lowThreshold){
            this.fillLevel.style = `
                border-radius: ${this.radius}px;
                color: ${this._settings.get_string('battery-bar-font-color')};
                background-color: ${this.lowColor};
            `;
        }else{
            this.fillLevel.style = `
                border-radius: ${this.radius}px;
                color: ${this._settings.get_string('battery-bar-font-color')};
                background-color: ${this.color};
            `;
        }
    }
});

const BatteryBar = GObject.registerClass(
class BatteryBar extends St.Bin{
    _init(settings){
        super._init({
            style_class: 'battery-bar panel-button',
            reactive: true
        });

        this._settings = settings;

        this._proxy = new PowerManagerProxy(
            Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org/freedesktop/UPower/devices/DisplayDevice'
        );
        this.binding = this._proxy.connect('g-properties-changed', () => this._sync());
        this.connect('destroy', () => {this._proxy.disconnect(this.binding); this._proxy = null});

        this.level = new LevelBar(this._settings);
        this.icon = new St.Icon({ style_class: 'system-status-icon' });

        let box = new St.BoxLayout();
        if(this._settings.get_int('battery-bar-icon-position') === 0){
            if(this._settings.get_boolean('battery-bar-show-icon')) box.add_child(this.icon);
            box.add_child(this.level);
        }else{
            box.add_child(this.level);
            if(this._settings.get_boolean('battery-bar-show-icon')) box.add_child(this.icon);
        }
        this.set_child(box);

        this.style = `
            padding-left: ${settings.get_int('battery-bar-padding-left')}px;
            padding-right: ${settings.get_int('battery-bar-padding-right')}px;
        `;
        this._sync();
        this.connect('enter-event', this._sync.bind(this));
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
            
        this.icon.icon_name = charged
            ? 'battery-level-100-charged-symbolic'
            : `battery-level-${fillLevel}${chargingState}-symbolic`;
    
        this.icon.fallback_icon_name = this._proxy.IconName;
    
        this._proxy.State === UPower.DeviceState.CHARGING ||
        this._proxy.State === UPower.DeviceState.FULLY_CHARGED ?
            this.level.charging = true :
            this.level.charging = false;
            
        this.level.value = this._proxy.Percentage/100;
    }
});

var Extension = class Extension{
    constructor(settings) {
        this._settings = settings;
        this._panelBox = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox
        ]

        this.stockIndicator = Main.panel.statusArea.quickSettings._system;
    }

    enable(){
        this._settings.connectObject(
            'changed::battery-bar-position',     this._addToPanel.bind(this),
            'changed::battery-bar-offset',       this._addToPanel.bind(this),
            'changed::battery-bar-show-icon',    this._addToPanel.bind(this),
            'changed::battery-bar-icon-position',this._addToPanel.bind(this),
            'changed::battery-bar-padding-left', this._addToPanel.bind(this),
            'changed::battery-bar-padding-right',this._addToPanel.bind(this),
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
        this._panelButton = new St.Bin({
            child: new BatteryBar(this._settings)
        });

        let pos = this._settings.get_int('battery-bar-position');
        let offset = this._settings.get_int('battery-bar-offset');

        this._panelBox[pos].insert_child_at_index(this._panelButton, offset);
    }
}
