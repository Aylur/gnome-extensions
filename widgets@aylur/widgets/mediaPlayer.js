'use strict';

const { GObject, St, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension()
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Media = Me.imports.shared.media;

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
            this.settings.set_int('media-player-cover-width', 70);
            this.settings.set_int('media-player-cover-height', 70);
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
            this.settings.set_int('media-player-cover-width', 270);
            this.settings.set_int('media-player-cover-height', 270);
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
        this.settings = settings;
        this.hide();
        this.label = new St.Label({
            text: 'artist - title',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this.label);
        let maxWidth = settings.get_int('media-player-max-width');
        if(maxWidth > 0) this.label.style = `max-width: ${maxWidth}px`;

        this.media = new MediaBox(settings, this.menu.box);
        this.media.add_style_class_name('media-player');
        this.media.connect('updated', () => this._sync());
        this.menu.box.add_child(this.media);
        this.menu.box.add_style_class_name('media-menu-box');

        this._sync();
    }

    _syncLabel(){
        if(!this.player) return;
        this.label.text = `${this.player.trackArtists.join(', ')} - ${this.player.trackTitle}`;
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
class MediaControls extends St.BoxLayout{
    _init(preferred){
        super._init({
            visible: false,
            style_class: 'panel-media-controls'
        });

        this.prevBtn = this._addButton('media-skip-backward-symbolic', () => this.player.previous());
        this.playBtn = this._addButton('media-playback-start-symbolic', () => this.player.playPause());
        this.nextBtn = this._addButton('media-skip-forward-symbolic', () => this.player.next());

        this.add_child(this.prevBtn);
        this.add_child(this.playBtn);
        this.add_child(this.nextBtn);

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
    constructor() {
        this.pos = [
            'left',
            'center',
            'right'
        ];
        this.panelBox = [
            Main.panel._leftBox,
            Main.panel._centerBox,
            Main.panel._rightBox
        ]
    }

    enable() {
        this.settings = ExtensionUtils.getSettings();
        this.settings.connect('changed::media-player-offset', () => this._reload());
        this.settings.connect('changed::media-player-position', () => this._reload());
        this.settings.connect('changed::media-player-controls-position', () => this._reload());
        this.settings.connect('changed::media-player-controls-offset', () => this._reload());
        this.settings.connect('changed::media-player-enable-controls', () => this._reload());
        this.settings.connect('changed::media-player-max-width', () => this._reload());
        this.settings.connect('changed::media-player-enable-track', () => this._reload());
        this.settings.connect('changed::media-player-prefer', () => this._reload());
        this._reload();

    }

    disable() {
        this.settings = null;

        if(this.panelButton){
            this.panelButton.destroy();
            this.panelButton = null;
        }
        if(this.controls){
            this.controls.destroy();
            this.controls = null;
        }
    }

    _reload(){
        if(this.panelButton){
            this.panelButton.destroy();
            this.panelButton = null;
        }
        if(this.controls){
            this.controls.destroy();
            this.controls = null;
        }

        let pos, offset

        pos = this.settings.get_int('media-player-position');
        offset = this.settings.get_int('media-player-offset');
        if(this.settings.get_boolean('media-player-enable-track')){
            this.panelButton = new MediaButton(this.settings);
            Main.panel.addToStatusArea('Media Player', this.panelButton, offset, this.pos[pos]);
        }

        pos = this.settings.get_int('media-player-controls-position');
        offset = this.settings.get_int('media-player-controls-offset');
        if(this.settings.get_boolean('media-player-enable-controls')){
            this.controls = new MediaControls(this.settings.get_string('media-player-prefer'));
            this.panelBox[pos].insert_child_at_index(this.controls, offset);
        }
    }
}