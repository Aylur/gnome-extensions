'use strict';

const { GObject, St, Clutter } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension()
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Media = Me.imports.shared.media;

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

        this.media = new Media.Media({ style_class: 'media-player' });
        this.media.connect('updated', () => this._sync());
        this.menu.box.add_child(this.media);

        this._sync();
        this.connect('destroy', () => {
            this.media = null;
            this.player = null;
        });
    }

    _syncLabel(){
        this.label.text = `${this.player._mediaArtist.text} - ${this.player._mediaTitle.text}`;
    }

    _sync(){
        let mpris = this.media.getPlayer();
        if(mpris){
            this.player = new Media.PlayerWidget(mpris);
            this._buildPlayerUI();
            this.media.set_child(this.player);
            this.player._mediaTitle.connect('notify::text', () => this._syncLabel());
            this.player._mediaArtist.connect('notify::text', () => this._syncLabel());
            this._syncLabel();
            this.show();
        }else{
            this.hide();
        }
    }

    _buildPlayerUI(){
        let elements = this.player;
        let box = this.player;
        box.vertical = true;
        box.style = `max-width: ${elements.controlsBox.width + 50}px`;

        let layout = this.settings.get_int('media-player-layout');
        if(layout === 1){ //compact
            elements.mediaCover.add_style_class_name('media-cover-compact');
            elements.titleBox.x_align = Clutter.ActorAlign.START;
            elements.titleBox.y_align = Clutter.ActorAlign.CENTER;
            let vbox = new St.BoxLayout({ style_class: 'media-container' });
            vbox.add_child(elements.mediaCover);
            vbox.add_child(elements.titleBox);
            box.add_child(vbox);
            box.add_child(elements.controlsBox);
            box.add_child(elements.volumeBox);
        }else{ //normal
            elements.mediaCover.add_style_class_name('media-cover-normal');
            elements.mediaCover.x_align = Clutter.ActorAlign.CENTER;
            box.add_child(elements.mediaCover);
            box.add_child(elements.titleBox);
            box.add_child(elements.controlsBox);
            box.add_child(elements.volumeBox);
        }
    }
});

const MediaControls = GObject.registerClass(
class MediaControls extends St.BoxLayout{
    _init(){
        super._init({ visible: false });

        this.prevBtn = this._addButton('media-skip-backward-symbolic', () => this.player.previous());
        this.playBtn = this._addButton('media-playback-start-symbolic', () => this.player.playPause());
        this.nextBtn = this._addButton('media-skip-forward-symbolic', () => this.player.next());

        this.add_child(this.prevBtn);
        this.add_child(this.playBtn);
        this.add_child(this.nextBtn);

        this.media = new Media.Media();
        this.media.connect('updated', () => this._sync());

        this._sync();
        this.connect('destroy', () => {
            if(this.player){
                this.player.disconnect(this.binding);
                this.player = null;
            }
        });
    }

    _addButton(iconName, callback){
        let btn = new St.Button({
            style_class: 'panel-button',
            child: new St.Icon({
                style_class: 'system-status-icon',
                icon_name: iconName
            })
        })
        btn.connect('clicked', callback);
        return btn;
    }

    _sync(){
        let mpris = this.media.getPlayer();
        if(mpris){
            if(this.binding)
                this.player.disconnect(this.binding);
            
            this.player = mpris;
            this.binding = this.player.connect('changed', () => this._syncControls());
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

        this.stockMpris = Main.panel.statusArea.dateMenu._messageList._mediaSection;
        this.shouldShow = this.stockMpris._shouldShow;
    }

    enable() {
        this.settings = ExtensionUtils.getSettings();
        this.settings.connect('changed::media-player-offset', () => this._reload());
        this.settings.connect('changed::media-player-position', () => this._reload());
        this.settings.connect('changed::media-player-layout', () => this._reload());
        this.settings.connect('changed::media-player-controls-position', () => this._reload());
        this.settings.connect('changed::media-player-controls-offset', () => this._reload());
        this.settings.connect('changed::media-player-enable-controls', () => this._reload());
        this.settings.connect('changed::media-player-max-width', () => this._reload());
        this.settings.connect('changed::media-player-enable-track', () => this._reload());
        this._reload();

        this.settings.connect('changed::media-player-hide-stock', () => this._hideStock());
        this._hideStock();
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

    _hideStock(show){
        if(show || !this.settings.get_boolean('media-player-hide-stock')){
            this.stockMpris._shouldShow = this.shouldShow;
            this.stockMpris.visible = this.stockMpris._shouldShow();
        }else{
            this.stockMpris.visible = false;
            this.stockMpris._shouldShow = () => false;
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
            this.controls = new MediaControls();
            this.panelBox[pos].insert_child_at_index(this.controls, offset);
        }
    }
}