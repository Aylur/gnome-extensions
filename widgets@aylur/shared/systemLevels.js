const { St, GLib, Shell, Gio, Clutter, GObject, GnomeDesktop, UPowerGlib: UPower } = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension()
const Mainloop = imports.mainloop;

const { loadInterfaceXML } = imports.misc.fileUtils;
const ByteArray = imports.byteArray;

const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

let GTop, hasGTop = true;
try {
    GTop = imports.gi.GTop;
} catch (e) {
    global.log(e);
    hasGTop = false;
}

//shouldn't be more than half the widthness of the bar
const ROUNDNESS = 8;
const ZERO_VALUE = ROUNDNESS*2;

const LevelBar = GObject.registerClass(
class LevelBar extends St.Bin{
    _init(vertical){
        super._init({
            y_expand: true,
            x_expand: true,
        });
        this.background = new St.Bin({
            style_class: 'level-bar calendar',
            pseudo_class: 'active'
        });
        this.fillLevel = new St.Widget({
            style_class: 'level-fill calendar-today',
            pseudo_class: 'selected'
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
            this.fillLevel.height = (max-ZERO_VALUE)*this.value + ZERO_VALUE;
        }else{
            let max = this.background.width;
            this.fillLevel.width = (max-ZERO_VALUE)*this.value + ZERO_VALUE;
        }
        if(this.value*100 < 1)
            this.fillLevel.hide();
        else
            this.fillLevel.show();
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
            style_class: 'usage-level',
            x_expand: true,
            y_expand: true
        });
        if(vertical) this.vertical = true;
        this.colorSwitchValues = [ 25, 50, 75, ];

        this.icon = new St.Icon({ reactive: true, track_hover: true });
        this.label = new St.Label();
        this.level = new LevelBar(vertical);
        this.hoverLabel = new St.Label({ style_class: 'dash-label' });
        this.icon.connect('notify::hover', () => this._toggleHoverLabel());

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

    _toggleHoverLabel() {
        if(this.icon.hover){
            Main.layoutManager.addTopChrome(this.hoverLabel);
            this.hoverLabel.opacity = 0;
            let [stageX, stageY] = this.icon.get_transformed_position();
            const iconWidth = this.icon.allocation.get_width();
            const labelWidth = this.hoverLabel.get_width();
            const xOffset = Math.floor((iconWidth - labelWidth) / 2);
            const x = Math.clamp(stageX + xOffset, 0, global.stage.width - labelWidth);
            const y = stageY - this.icon.height;
            this.hoverLabel.set_position(x, y);
    
            this.hoverLabel.ease({
                opacity: 255,
                duration: 300,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }else{
            Main.layoutManager.removeChrome(this.hoverLabel);
        }
    }
});

const DisplayDeviceInterface = loadInterfaceXML('org.freedesktop.UPower.Device');
const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(DisplayDeviceInterface);

var PowerLevel = GObject.registerClass(
class PowerLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.icon.icon_name = 'battery-symbolic';
        this.hoverLabel.text = 'Battery';
        this.colorSwitchValues = [ 75, 50, 25 ];

        this._proxy = new PowerManagerProxy(Gio.DBus.system,
            'org.freedesktop.UPower',
            '/org/freedesktop/UPower/devices/DisplayDevice',
            (proxy, error) => {
                if (error) {
                    log(error.message);
                }
        });

        this.connect('destroy', () => this._proxy = null);
    }

    setUsage(){
        if(this._proxy.IsPresent  && !this.disabled){
            this.show();
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
        }else{
            this.hide();
        }
    }
});

var CpuLevel = GObject.registerClass(
class CpuLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.icon.icon_name = 'org.gnome.SystemMonitor-symbolic';
        this.hoverLabel.text = _('CPU');

        this.lastCPUTotal = 0;
        this.lastCPUUsed = 0;
    }

    setUsage(){
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

        this.icon.icon_name = 'drive-harddisk-solidstate-symbolic';
        this.hoverLabel.text = _('RAM');
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
        this.icon.fallback_gicon = Gio.Icon.new_for_string(
            Me.path+'/media/temperature-symbolic.svg'
        );
        this.hoverLabel.text = _('Temperature');
        this.colorSwitchValues = [ 50, 65, 80 ];
    }

    setUsage(){
        try {
            const [, contents, etag] = 
                Gio.File.new_for_path('/sys/class/thermal/thermal_zone0/temp')
                .load_contents(null);

            const temperature = Number.parseInt(
                new TextDecoder('utf-8').decode(contents)
            ) / 100000;

            this.level.value = temperature;
            this.label.text = Math.floor(temperature*100).toString() + '\˚';

            this.show();
        }catch (e) {
            this.hide();
        }
    }
});

var StorageLevel = GObject.registerClass(
class StorageLevel extends UsageLevel{
    _init(vertical){
        super._init(vertical);

        this.icon.icon_name = 'drive-harddisk-symbolic';
        this.hoverLabel.text = _('Disk');
        this.colorSwitchValues = [ 40, 60, 80 ];

        if(hasGTop)
            this.storage = new GTop.glibtop_fsusage();
        
        this.connect('destroy', () => { if(this.storage) this.storage = null});
    }
    
    setUsage(){
        if(hasGTop){
            GTop.glibtop_get_fsusage(this.storage, '/');
            let max = this.storage.blocks * this.storage.block_size;
            let free = this.storage.bfree * this.storage.block_size;
            let used = max - free;
            this.level.value = used/max;
            this.label.text = Math.floor((used/max)*100).toString() + '%';
        }
        else{
            this.hide();
        }
    }
});

var LevelsBox = GObject.registerClass(
class LevelsBox extends St.BoxLayout{
    _init(settings, settingName, vertical = false){
        super._init({
            x_expand: true,
            y_expand: true,
            style_class: 'container',
            vertical: !vertical,
            reactive: true,
        });

        this.levels = [
            new PowerLevel(vertical),
            new StorageLevel(vertical),
            new CpuLevel(vertical),
            new RamLevel(vertical),
            new TempLevel(vertical),
        ];

        this.settings = settings;
        this.settingName = settingName;
        this._connections = [];
        this._connect('battery');
        this._connect('storage');
        this._connect('cpu');    
        this._connect('ram');    
        this._connect('temp');   

        this.levels.forEach(s => {
            this.add_child(s);
        });

        this._sync();
        this.connect('destroy', this._onDestroy.bind(this));
    }

    _onDestroy(){
        this._connections.forEach(c => 
            this.settings.disconnect(c)
        );
        this.stopTimeout();
    }

    _connect(name){
        this._connections.push(
            this.settings.connect(`changed::${this.settingName}-${name}`,
                () => this._sync()
            )
        )
    }

    _sync(){
        this.settings.get_boolean(`${this.settingName}-battery`)? this.levels[0].disabled = false : this.levels[0].disabled = true;
        this.settings.get_boolean(`${this.settingName}-storage`)? this.levels[1].show() : this.levels[1].hide();
        this.settings.get_boolean(`${this.settingName}-cpu`)    ? this.levels[2].show() : this.levels[2].hide();
        this.settings.get_boolean(`${this.settingName}-ram`)    ? this.levels[3].show() : this.levels[3].hide();
        this.settings.get_boolean(`${this.settingName}-temp`)   ? this.levels[4].show() : this.levels[4].hide();
    }

    startTimeout(){
        this.timeout = Mainloop.timeout_add_seconds(1.0, this.updateLevels.bind(this));
    }

    stopTimeout(){
        if(this.timeout){
            Mainloop.source_remove(this.timeout);
            this.timeout = null;
        }
    }

    updateLevels(){
        this.levels.forEach(l => {
            l.updateLevel();
        });
        return true;
    }
});
