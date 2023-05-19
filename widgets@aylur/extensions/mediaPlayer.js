const { GObject, St, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension()
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Media = Me.imports.shared.media;
const { PanelButton } = Me.imports.shared.panelButton;

const MediaBox = GObject.registerClass(
class MediaBox extends Media.MediaBox{
    _init(settings, box){
        this.parentBox = box;
        super._init(settings, 'media-player');
    }

    _buildPlayerUI(){
        this.parentBox.remove_style_class_name('full');
        this.parentBox.style = '';
        super._buildPlayerUI();
        switch (this.layout) {
            case 1: this._normal(false); break;
            case 2: this._compact(); break;
            case 3: this._labelOnCover(); break;
            case 4: this._labelOnCover(false); break;
            case 5: this._full(); break;
            default: this._normal(); break;
        }
    }

    _normal(vertical){
        super._normal(vertical);
        this.player.style = `max-width: ${this.player.controlsBox.width + 50}px;`;
    }

    _compact(){
        let p = this.player;
        if(p.mediaCover.width > 100 || p.mediaCover.height > 100){
            this._settings.set_int('media-player-cover-width', 70);
            this._settings.set_int('media-player-cover-height', 70);
        }
        
        p.vertical = true;
        p.style = `max-width: ${p.controlsBox.width + 50}px;`;
        
        p.titleBox.y_align = Clutter.ActorAlign.CENTER;
        p.titleBox.x_expand = true;
        let hbox = new St.BoxLayout({ style_class: 'media-container' });
        hbox.add_child(p.mediaCover);
        if(this.showText) hbox.add_child(p.titleBox);
        p.add_child(hbox);
        p.add_child(p.controlsBox);
        if(this.showVolume) p.add_child(p.volumeBox);
    }

    _full(){
        let p = this.player;
        if(p.mediaCover.width < 100 || p.mediaCover.height < 100){
            this._settings.set_int('media-player-cover-width', 270);
            this._settings.set_int('media-player-cover-height', 270);
        }
        super._full();
        if(!this.showVolume){
            this.parentBox.add_style_class_name('full');
            this.parentBox.style = `border-radius: ${this.coverRadius}px;`
        }
    }
});

const MediaButton = GObject.registerClass(
class MediaButton extends PanelMenu.Button{
    _init(settings){
        super._init(0.5, 'Media Player', false);
        this.add_style_class_name('panel-media-button');
        this.hide();

        let box = new St.BoxLayout();
        this.add_child(box);
        
        this._label = new St.Label({
            text: 'artist - title',
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(this._label);

        this._icon = new St.Icon({
            style_class: 'system-status-icon panel-player-icon',
            fallback_icon_name: 'audio-x-generic-symbolic',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._coloredIcon = settings.get_boolean('media-player-colored-player-icon');
        if(settings.get_boolean('media-player-show-player-icon')){
            let iconPos = settings.get_int('media-player-player-icon-position');
            iconPos > 0
                ? this._icon.add_style_class_name('right')
                : this._icon.add_style_class_name('left');
            box.insert_child_at_index(this._icon, iconPos);
        }

        let maxWidth = settings.get_int('media-player-max-width');
        if(maxWidth > 0) this._label.style = `max-width: ${maxWidth}px`;

        this.media = new MediaBox(settings, this.menu.box);
        this.media.add_style_class_name('media-player');
        this.media.connect('updated', () => this._sync());
        this.menu.box.add_child(this.media);
        this.menu.box.add_style_class_name('media-menu-box');

        this._sync();
    }

    _syncLabel(){
        if(!this.player) return;
        this._label.text = `${this.player.trackArtists.join(', ')} - ${this.player.trackTitle}`;
        this._icon.icon_name = `${this.player.entry}${this._coloredIcon ? '' : '-symbolic'}`;
    }

    _sync(){
        let mpris = this.media.getPreferred();
        if(mpris){
            this.player = mpris;
            this.player.connectObject(
                'changed', () => this._syncLabel(),
                'closed', () => mpris.disconnectObject(this),
                this);
            this.show();
        }else{
            this.player = null;
            this.hide();
        }
    }
});

const MediaControls = GObject.registerClass(
class MediaControls extends PanelMenu.Button{
    _init(preferred){
        super._init(0, 'Media Controls', true);
        this.style_class = 'panel-media-controls';
        this.visible = false;

        this.prevBtn = this._addButton('media-skip-backward-symbolic', () => this.player.previous());
        this.playBtn = this._addButton('media-playback-start-symbolic', () => this.player.playPause());
        this.nextBtn = this._addButton('media-skip-forward-symbolic', () => this.player.next());

        let box = new St.BoxLayout();
        this.add_child(box);
        box.add_child(this.prevBtn);
        box.add_child(this.playBtn);
        box.add_child(this.nextBtn);

        this.media = new Media.Media({}, preferred);
        this.media.connect('updated', () => this._sync());

        this._sync();
    }

    _addButton(iconName, callback){
        let btn = new St.Button({
            style_class: 'panel-button',
            child: new St.Icon({
                style_class: 'system-status-icon',
                icon_name: iconName,
            })
        })
        btn.connect('clicked', callback);
        return btn;
    }

    _sync(){
        let mpris = this.media.getPreferred();
        if(mpris){
            this.player = mpris;
            this.player.connectObject(
                'changed', () => this._syncControls(),
                'closed', () => mpris.disconnectObject(this),
                this);
            this.show();
        }else{
            this.player = null;
            this.hide();
        }
    }
    
    _syncControls(){
        if(!this.player) return;

        this.player.canGoNext ? this.nextBtn.show() : this.nextBtn.hide();
        this.player.canGoPrev ? this.prevBtn.show() : this.prevBtn.hide();
        
        if(this.player.canPlay){
            this.playBtn.show();
            switch (this.player.playBackStatus) {
                case "Playing":
                    this.playBtn.child.icon_name = 'media-playback-pause-symbolic';
                    break;
                case "Paused":
                    this.playBtn.child.icon_name = 'media-playback-start-symbolic';
                    break;
                case "Stopped":
                    this.playBtn.child.icon_name = 'media-playback-start-symbolic';
                    break;
                default:
                    break;
            }
        }else{
            this.playBtn.hide();
        }
    }
});

var Extension = class Extension {
    constructor(settings) {
        this._signals = [
            'media-player-offset',
            'media-player-position',
            'media-player-controls-position',
            'media-player-controls-offset',
            'media-player-enable-controls',
            'media-player-max-width',
            'media-player-enable-track',
            'media-player-show-player-icon',
            'media-player-colored-player-icon',
            'media-player-player-icon-position',
            'media-player-prefer',
        ];
        this._settings = settings;
        this._buttons = { media: null, controls: null };
    }

    _media() {
        return new PanelButton({
            settings: this._settings,
            indicator: MediaButton,
            name: 'media-player',
            signals: []
        });
    }

    _controls() {
        return new PanelButton({
            settings: this._settings,
            indicator: MediaControls,
            name: 'media-player-controls',
            signals: []
        });
    }

    enable() {
        let arr = [];
        this._signals.forEach(s =>
            arr.push(`changed::${s}`, this._reload.bind(this))
        );
        this._settings.connectObject(...arr, this);
        this._reload();
    }

    disable() {
        this._settings.disconnectObject(this);
    }

    _reload(){
        if(this._buttons.media) {
            this._buttons.media.disable();
            this._buttons.media = null;
        }

        if(this._buttons.controls) {
            this._buttons.controls.disable();
            this._buttons.controls = null;
        }

        if(this._settings.get_boolean('media-player-enable-track')) {
            this._buttons.media = this._media();
            this._buttons.media.enable();
        }

        if(this._settings.get_boolean('media-player-enable-controls')) {
            this._buttons.controls = this._controls();
            this._buttons.controls.enable();
        }
    }
}
