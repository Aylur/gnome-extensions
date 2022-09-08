'use strict';

const { St, GLib, Shell, Gio, Clutter, GObject, GnomeDesktop, UPowerGlib: UPower } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension()
const DateMenu = Main.panel.statusArea.dateMenu;
const Mainloop = imports.mainloop;

const { loadInterfaceXML } = imports.misc.fileUtils;
const ByteArray = imports.byteArray;

const LevelBar = GObject.registerClass(
class LevelBar extends St.Bin{
    _init(vertical){
        super._init({
            y_expand: true,
            x_expand: true,
        });
        this.background = new St.Bin({
            style_class: 'level-bar workspace-thumbnail'
        });
        this.fillLevel = new St.Widget({
            style_class: 'level-fill calendar-today'
        });
        this.set_child(this.background);
        this.background.set_child(this.fillLevel);

        this.value = 0;
        if(vertical) this.set_vertical();
        else this.set_horizontal();

        this.connect('notify::value', () => this.repaint());
    }
    repaint(){
        if(this.value > 1) this.value = 1;
        if(this.value < 0) this.value = 0;
        if(this.vertical){
            let max = this.background.height;
            this.fillLevel.height = max*this.value;
        }else{
            let max = this.background.width;
            this.fillLevel.width = max*this.value;
        }
    }
    set_vertical(){
        this.background.y_expand = true;
        this.background.y_align = Clutter.ActorAlign.FILL;
        this.background.x_expand = true;
        this.background.x_align = Clutter.ActorAlign.CENTER;
        this.fillLevel.y_expand = true;
        this.fillLevel.y_align = Clutter.ActorAlign.END;
        this.fillLevel.x_expand = true;
        this.fillLevel.x_align = Clutter.ActorAlign.FILL;
        this.vertical = true;
    }
    set_horizontal(){
        this.background.y_expand = true;
        this.background.y_align = Clutter.ActorAlign.CENTER;
        this.background.x_expand = true;
        this.background.x_align = Clutter.ActorAlign.FILL;
        this.fillLevel.y_expand = true;
        this.fillLevel.y_align = Clutter.ActorAlign.FILL;
        this.fillLevel.x_expand = true;
        this.fillLevel.x_align = Clutter.ActorAlign.START;
        this.vertical = false;
    }
});

const UsageLevel = GObject.registerClass(
class UsageLevel extends St.BoxLayout{
    _init(vertical){
        super._init({
            style_class: 'db-usage-level db-container',
        });
        if(vertical) this.vertical = true;
        this.colorSwitchValues = [ 25, 50, 75, ];
                                   //low green
                                  //high red

        this.icon = new St.Icon();
        this.level = new LevelBar(vertical);
        this.label = new St.Label();

        this._buildUI();
    }
    updateLevel(){
        this.setUsage();
        this.setColorClass();
        this.level.repaint();
    }
    setColorClass(){
        let value = this.level.value*100;
        this.remove_style_pseudo_class('red');
        this.remove_style_pseudo_class('orange');
        this.remove_style_pseudo_class('yellow');
        this.remove_style_pseudo_class('green');
        if(this.colorSwitchValues[0] < this.colorSwitchValues[2] ){
            if(value >= this.colorSwitchValues[2]) this.add_style_pseudo_class('red');
            else if(value < this.colorSwitchValues[2] && value >= this.colorSwitchValues[1]) this.add_style_pseudo_class('orange');
            else if(value < this.colorSwitchValues[1] && value >= this.colorSwitchValues[0]) this.add_style_pseudo_class('yellow');
            else if(value < this.colorSwitchValues[0]) this.add_style_pseudo_class('green');
        }else{
            if(value >= this.colorSwitchValues[2]) this.add_style_pseudo_class('green');
            else if(value < this.colorSwitchValues[2] && value >= this.colorSwitchValues[1]) this.add_style_pseudo_class('yellow');
            else if(value < this.colorSwitchValues[1] && value >= this.colorSwitchValues[0]) this.add_style_pseudo_class('orange');
            else if(value < this.colorSwitchValues[0]) this.add_style_pseudo_class('red');
        }
    }
    _buildUI(){
        if(this.vertical){
            this.add_child(this.label);
            this.add_child(this.level);
            this.add_child(this.icon);
            this.vertical = true;
            this.label.style = 'text-align: center';
            this.x_align = Clutter.ActorAlign.CENTER;
            this.x_expand = true;
        }else{
            this.add_child(this.icon);
            this.add_child(this.level);
            this.add_child(this.label);
            this.y_align = Clutter.ActorAlign.CENTER;
            this.y_expand = true;
        }
    }
});

const DisplayDeviceInterface = loadInterfaceXML('org.freedesktop.UPower.Device');
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

var PowerLevel = GObject.registerClass(
class PowerLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.colorSwitchValues = [ 75, 50, 25 ];

        this._proxy = new PowerManagerProxy(Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org/freedesktop/UPower/devices/DisplayDevice',
            (proxy, error) => {
                if (error) {
                    log(error.message);
                } else {
                    this._proxy.connect('g-properties-changed',
                        this._sync.bind(this));
                }
                this._sync();
        });

        this.connect('destroy', () => this._proxy = null);
    }
    _sync(){
        // The icons
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
        this.label.text = this._proxy.Percentage.toString() + '%';
        this.level.value = this._proxy.Percentage/100;
        
        if(fillLevel > 99){
            this.label.text = 'F';
        }
        this.setColorClass();
    }
    setUsage(){}
});

var CpuLevel = GObject.registerClass(
class CpuLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.icon.icon_name = 'computer-chip-symbolic';

        this.lastCPUTotal = 0;
        this.lastCPUUsed = 0;
    }
    setUsage(){
        //stolen from here
        //https://github.com/eeeeeio/gnome-shell-extension-nano-system-monitor/blob/master/src/extension.js
        let currentCPUUsage = 0;
      
        try {
            const inputFile = Gio.File.new_for_path("/proc/stat");
            const fileInputStream = inputFile.read(null);
            const dataInputStream = new Gio.DataInputStream({
                base_stream: fileInputStream
            });
      
            let currentCPUUsed = 0;
            let currentCPUTotal = 0;
            let line = null;
            let length = 0;
      
            while (([line, length] = dataInputStream.read_line(null)) && line != null) {
                if (line instanceof Uint8Array) {
                    line = ByteArray.toString(line).trim();
                } else {
                    line = line.toString().trim();
                }
                
                const fields = line.split(/\W+/);
                
                if (fields.length < 2) {
                    continue;
                }
            
                const itemName = fields[0];
                if (itemName == "cpu" && fields.length >= 5) {
                    const user = Number.parseInt(fields[1]);
                    const system = Number.parseInt(fields[3]);
                    const idle = Number.parseInt(fields[4]);
                    currentCPUUsed = user + system;
                    currentCPUTotal = user + system + idle;
                    break;
                }
            }
      
            fileInputStream.close(null);
      
            // Avoid divide by zero
            if (currentCPUTotal - this.lastCPUTotal !== 0) {
                currentCPUUsage =
                    (currentCPUUsed - this.lastCPUUsed) / (currentCPUTotal - this.lastCPUTotal);
            }
      
            this.lastCPUTotal = currentCPUTotal;
            this.lastCPUUsed = currentCPUUsed;
        } catch (e) {
            logError(e);
        }

        this.level.value = currentCPUUsage;
        this.label.text = Math.floor(currentCPUUsage*100).toString() + '%';
    }
});

var RamLevel = GObject.registerClass(
class RamLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.icon.icon_name = 'application-x-firmware-symbolic';

    }
    setUsage(){
        let currentMemoryUsage = 0;
        try {
            const inputFile = Gio.File.new_for_path("/proc/meminfo");
            const fileInputStream = inputFile.read(null);
            const dataInputStream = new Gio.DataInputStream({
                base_stream: fileInputStream
            });
    
            let memTotal = -1;
            let memAvailable = -1;
            let line = null;
            let length = 0;
            
            while (([line, length] = dataInputStream.read_line(null)) && line != null) {
                if (line instanceof Uint8Array) {
                    line = ByteArray.toString(line).trim();
                } else {
                    line = line.toString().trim();
                }
                const fields = line.split(/\W+/);
                if (fields.length < 2) {
                    break;
                }
                const itemName = fields[0];
                const itemValue = Number.parseInt(fields[1]);
                if (itemName == "MemTotal") {
                    memTotal = itemValue;
                }
                if (itemName == "MemAvailable") {
                    memAvailable = itemValue;
                }
                if (memTotal !== -1 && memAvailable !== -1) {
                    break;
                }
            }
            fileInputStream.close(null);
            if (memTotal !== -1 && memAvailable !== -1) {
                const memUsed = memTotal - memAvailable;
                currentMemoryUsage = memUsed / memTotal;
            }
        }catch (e) {
            logError(e);
        }

        this.level.value = currentMemoryUsage;
        this.label.text = Math.floor(currentMemoryUsage*100).toString() + '%';
    }
});

var TempLevel = GObject.registerClass(
class TempLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.icon.icon_name = 'temperature-symbolic';
        this.colorSwitchValues = [ 50, 65, 80 ];

    }
    setUsage(){
        let temperature = 0;
        try {
            const inputFile = Gio.File.new_for_path("/sys/class/thermal/thermal_zone0/temp");
            const fileInputStream = inputFile.read(null);
            const dataInputStream = new Gio.DataInputStream({
                base_stream: fileInputStream
            });

            let [line, length] = dataInputStream.read_line(null);
            if (line instanceof Uint8Array)
                line = ByteArray.toString(line).trim();
            else  line = line.toString().trim();

            temperature = Number.parseInt(line) / 100000;
            fileInputStream.close(null);
        }catch (e) {
            logError(e);
        }

        this.level.value = temperature;
        this.label.text = Math.floor(temperature*100).toString() + '\˚';
    }
});

var DirLevel = GObject.registerClass(
class DirLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.icon.icon_name = 'drive-harddisk-symbolic';
        this.colorSwitchValues = [ 40, 60, 80 ];
    }
    setUsage(){
        let [ ok, out, err, exit ] = GLib.spawn_command_line_sync('df');
        if (out instanceof Uint8Array)
            out = ByteArray.toString(out).trim();
        else out = out.toString().trim();

        let max = 0;
        let used = 0;

        let lines = out.split(/\n/);
        lines.forEach(line => {
            const fields = line.split(/\s+/);
            if(fields[5] == '/'){
                max = Number.parseInt(fields[1]) / Math.pow(1024,2);
                used = Number.parseInt(fields[2]) / Math.pow(1024,2);

                max = Math.floor(max);
                used = Math.floor(used);
            }
        });

        this.level.value = used/max;
        this.label.text = Math.floor((used/max)*100).toString() + '%';
    }
});