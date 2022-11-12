'use strict'

const { GObject, St, Clutter, Gio, UPowerGlib: UPower } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension()
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
            x_expand: false,
        });
        this.background.label = new St.Label({
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._value = 0;
        this.settings = settings;

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
        this.width = this.settings.get_int('battery-bar-width');
        this.background.height = this.settings.get_int('battery-bar-height');

        this.showLabel = this.settings.get_boolean('battery-bar-show-percentage');
        this.chargingColor = this.settings.get_string('battery-bar-charging-color');
        this.lowColor = this.settings.get_string('battery-bar-low-color');
        this.color = this.settings.get_string('battery-bar-color');
        this.lowThreshold = this.settings.get_int('battery-bar-low-threshold');

        this.radius = this.settings.get_int('battery-bar-roundness');
        this.background.style = `
            border-radius: ${this.radius}px;
            color: ${this.settings.get_string('battery-bar-font-bg-color')};
            background-color: ${this.settings.get_string('battery-bar-bg-color')};
        `;

        if(repaint) this.repaint();
    }

    repaint(recursive = true){
        if(this.fillLevel.has_allocation() && this.background.has_allocation()){
            let max = this.width;
            let zero = Math.min(this.radius*2, this.background.height);
    
            this.fillLevel.width = Math.floor( (max-zero)*this._value + zero );
    
            let label = Math.floor(this._value*100).toString() + "%";
            this.fillLevel.label.text = label;
            this.background.label.text = label;

            
            if(this.settings.get_boolean('battery-bar-show-percentage')){
                if(this._value >= 0.5){
                    if(!this.fillLevel.hasLabel){
                        this.fillLevel.set_child(this.fillLevel.label);
                        this.fillLevel.hasLabel = true;
                    }
                    if(this.background.hasLabel){
                        this.background.remove_child(this.background.label);
                        this.background.hasLabel = false;
                    }
                }else{
                    if(this.fillLevel.hasLabel){
                        this.fillLevel.remove_child(this.fillLevel.label);
                        this.fillLevel.hasLabel = false;
                    }
                    if(!this.background.hasLabel){
                        this.background.add_child(this.background.label);
                        this.background.hasLabel = true;
                    }
                }
            }else{
                if(this.fillLevel.hasLabel){
                    this.fillLevel.remove_child(this.fillLevel.label);
                    this.fillLevel.hasLabel = false;
                }
                if(this.background.hasLabel){
                    this.background.remove_child(this.background.label);
                    this.background.hasLabel = false;
                }
            }

            if(this.charging){
                this.fillLevel.style = `
                    border-radius: ${this.radius}px;
                    color: ${this.settings.get_string('battery-bar-font-color')};
                    background-color: ${this.chargingColor};
                `;
            }else if(this._value*100 <= this.lowThreshold){
                this.fillLevel.style = `
                    border-radius: ${this.radius}px;
                    color: ${this.settings.get_string('battery-bar-font-color')};
                    background-color: ${this.lowColor};
                `;
            }else{
                this.fillLevel.style = `
                    border-radius: ${this.radius}px;
                    color: ${this.settings.get_string('battery-bar-font-color')};
                    background-color: ${this.color};
                `;
            }
            
        }
        else{
            if(recursive)
                setTimeout(() => this.repaint(false), 2000);
        }
    }
});

const BatteryBar = GObject.registerClass(
class BatteryBar extends St.Bin{
    _init(settings){
        super._init({
            style_class: 'battery-bar panel-button',
        });

        this.settings = settings;

        this._proxy = new PowerManagerProxy(
            Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org/freedesktop/UPower/devices/DisplayDevice'
        );
        this.binding = this._proxy.connect('g-properties-changed', () => this._sync());
        this.connect('destroy', () => {this._proxy.disconnect(this.binding); this._proxy = null});

        this.level = new LevelBar(this.settings);
        this.icon = new St.Icon({ style_class: 'system-status-icon' });

        let box = new St.BoxLayout();
        if(this.settings.get_int('battery-bar-icon-position') === 0){
            if(this.settings.get_boolean('battery-bar-show-icon')) box.add_child(this.icon);
            box.add_child(this.level);
        }else{
            box.add_child(this.level);
            if(this.settings.get_boolean('battery-bar-show-icon')) box.add_child(this.icon);
        }
        this.set_child(box);

        this._sync();
    }

    _sync(){
        if(this._proxy.IsPresent){
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
        }else{
            this.hide();
        }
    }
});

var Extension = class Extension{
    constructor() {
        this.panel = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox
        ]

        if(Main.panel.statusArea.quickSettings)
            this.stockIndicator = Main.panel.statusArea.quickSettings._system;

        if(Main.panel.statusArea.aggregateMenu)
            this.stockIndicator = Main.panel.statusArea.aggregateMenu._power;
    }
    enable(){
        this.settings = ExtensionUtils.getSettings();
        this.settings.connect('changed::battery-bar-position', () => this.addToPanel());
        this.settings.connect('changed::battery-bar-offset', () => this.addToPanel());
        this.settings.connect('changed::battery-bar-show-icon', () => this.addToPanel());
        this.settings.connect('changed::battery-bar-icon-position', () => this.addToPanel());
        this.addToPanel();
        this.stockIndicator.hide();
    }
    disable(){
        this.settings = null;
        this.panelButton.destroy();
        this.panelButton = null;
        this.stockIndicator.show();
    }
    addToPanel(){
        if(this.panelButton){
            this.panelButton.destroy();
            this.panelButton = null;
        }
        this.panelButton = new BatteryBar(this.settings);

        let pos = this.settings.get_int('battery-bar-position');
        let offset = this.settings.get_int('battery-bar-offset');

        this.panel[pos].insert_child_at_index(this.panelButton, offset);

    }
}