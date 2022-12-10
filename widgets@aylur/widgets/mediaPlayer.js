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

        let pref = settings.get_string('media-player-prefer');
        this.media = new Media.Media({ style_class: 'media-player' }, pref);
        this.media.connect('updated', () => this._sync());
        this.menu.box.add_child(this.media);
        this.menu.box.add_style_class_name('media-menu-box');

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
        let mpris = this.media.getPreferred();
        if(mpris){
            let loopShuffle = this.settings.get_boolean('media-player-show-loop-shuffle');
            this.coverRadius = this.settings.get_int('media-player-cover-roundness');
            this.player = new Media.PlayerWidget(mpris, loopShuffle, this.coverRadius);
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
        this.coverWidth = this.settings.get_int('media-player-cover-width');
        this.coverHeight = this.settings.get_int('media-player-cover-height');
        this.showText = this.settings.get_boolean('media-player-show-text');
        this.showVolume = this.settings.get_boolean('media-player-show-volume');
        let textAlign = this.settings.get_int('media-player-text-align');
        let align;
        switch (textAlign) {
            case 0: align = 'left'; break;
            case 2: align = 'right'; break;        
            default: align = 'center'; break;
        }
        this.player.titleBox.style = `text-align: ${align};`;
        this.player.mediaCover.width = this.coverWidth;
        this.player.mediaCover.height = this.coverHeight;

        let layout = this.settings.get_int('media-player-layout');
        switch (layout) {
            case 1: this._compact(); break;
            case 2: this._labelOnCover(); break;
            case 3: this._labelOnCoverVertical(); break;
            case 4: this._labelOnCoverv2(); break;
            default: this._normal(); break;
        }
    }

    _normal(){
        let p = this.player;
        p.vertical = true;
        p.style = `max-width: ${Math.max(p.controlsBox.width+50,p.mediaCover.width)}px;`;

        p.add_child(p.mediaCover);
        if(this.showText) p.add_child(p.titleBox);
        p.add_child(p.controlsBox);
        if(this.showVolume) p.add_child(p.volumeBox);
    }

    _compact(){
        if(this.coverWidth < 100 || this.coverHeight < 100){
            this.settings.set_int('media-player-cover-width', 70);
            this.settings.set_int('media-player-cover-height', 70);
        }
        
        let p = this.player;
        p.vertical = true;
        p.style = `max-width: ${p.controlsBox.width + 50}px;`;
        
        p.titleBox.y_align = Clutter.ActorAlign.CENTER;
        let vbox = new St.BoxLayout({ style_class: 'media-container' });
        vbox.add_child(p.mediaCover);
        if(this.showText) vbox.add_child(p.titleBox);
        p.add_child(vbox);
        p.add_child(p.controlsBox);
        if(this.showVolume) p.add_child(p.volumeBox);
    }

    _labelOnCover(){
        if(this.coverWidth < 220 || this.coverHeight < 220){
            this.settings.set_int('media-player-cover-width', 220);
            this.settings.set_int('media-player-cover-height', 220);
        }

        let p = this.player;
        p.vertical = true;

        let pos = this.settings.get_int('media-player-text-position');
        p.controlsBox.width = this.coverWidth;
        p.controlsBox.insert_child_at_index(new St.Widget({ x_expand: true }),0);
        p.controlsBox.add_child(new St.Widget({ x_expand: true }));
        let vbox = new St.BoxLayout({ vertical: true, x_expand: true, y_expand: true });
        if(pos == 0){
            p.titleBox.add_style_class_name('fade-from-top');
            p.titleBox.style += `border-radius: ${this.coverRadius-1}px ${this.coverRadius-1}px 0 0;`;
            p.controlsBox.add_style_class_name('fade-from-bottom');
            p.controlsBox.style = `border-radius: 0 0 ${this.coverRadius-1}px ${this.coverRadius-1}px;`;
            if(this.showText) vbox.add_child(p.titleBox);
            vbox.add_child(new St.Widget({ y_expand: true }));
            vbox.add_child(p.controlsBox);
        }
        else{
            p.controlsBox.add_style_class_name('fade-from-top');
            p.controlsBox.style = `border-radius: ${this.coverRadius-1}px ${this.coverRadius-1}px 0 0;`;
            p.titleBox.add_style_class_name('fade-from-bottom');
            p.titleBox.style += `border-radius: 0 0 ${this.coverRadius-1}px ${this.coverRadius-1}px;`;
            vbox.add_child(p.controlsBox);
            vbox.add_child(new St.Widget({ y_expand: true }));
            if(this.showText) vbox.add_child(p.titleBox);
        }

        p.mediaCover.set_child(vbox);
        p.add_child(p.mediaCover);

        if(this.showVolume){
           p.add_child(p.volumeBox); 
        }else{
            this.menu.box.add_style_class_name('full');
            this.menu.box.style = `border-radius: ${this.coverRadius-1}px;`
        }
    }

    _labelOnCoverVertical(){
        let p = this.player;
        
        let pos = this.settings.get_int('media-player-text-position');
        let hbox = new St.BoxLayout({ style_class: 'media-container' });
        let vbox = new St.BoxLayout({ vertical: true, x_expand: true, y_expand: true });
        p.controlsBox.vertical = true;
        if(pos == 0){
            p.titleBox.style += `border-radius: ${this.coverRadius-1}px ${this.coverRadius-1}px 0 0;`;
            p.titleBox.add_style_class_name('fade-from-top');
            p.titleBox.y_align = Clutter.ActorAlign.START;
            if(this.showText) vbox.add_child(p.titleBox);
        }
        else{
            p.titleBox.style += `border-radius: 0 0 ${this.coverRadius-1}px ${this.coverRadius-1}px;`;
            p.titleBox.add_style_class_name('fade-from-bottom');
            p.titleBox.y_align = Clutter.ActorAlign.END;
            p.titleBox.y_expand = true;
            if(this.showText) vbox.add_child(p.titleBox);
        }
        p.mediaCover.set_child(vbox);

        hbox.add_child(p.mediaCover);
        hbox.add_child(p.controlsBox);
        p.vertical = true;
        p.add_child(hbox);
        if(this.showVolume) p.add_child(p.volumeBox);
    }

    _labelOnCoverv2(){
        if(this.coverWidth < 250 || this.coverHeight < 250){
            this.settings.set_int('media-player-cover-width', 250);
            this.settings.set_int('media-player-cover-height', 250);
        }

        let p = this.player;
        let pos = this.settings.get_int('media-player-text-position');
        let vbox = new St.BoxLayout({ vertical: true, x_expand: true, y_expand: true });

        p.vertical = true;
        p.titleBox.add_style_class_name('fill');
        p.titleBox.x_align = Clutter.ActorAlign.CENTER;
        p.controlsBox.add_style_class_name('fill');
        p.controlsBox.x_align = Clutter.ActorAlign.CENTER;
        if(pos == 0){
            p.titleBox.style += `border-radius: 0 0 ${this.coverRadius-1}px ${this.coverRadius-1}px;`;
            p.controlsBox.style = `border-radius: ${this.coverRadius-1}px ${this.coverRadius-1}px 0 0;`;
            p.controlsBox.y_align = Clutter.ActorAlign.END;
            if(this.showText) vbox.add_child(p.titleBox);
            vbox.add_child(new St.Widget({ y_expand: true }));
            vbox.add_child(p.controlsBox);
        }
        else{
            p.titleBox.style += `border-radius: ${this.coverRadius-1}px ${this.coverRadius-1}px 0 0;`;
            p.controlsBox.style = `border-radius: 0 0 ${this.coverRadius-1}px ${this.coverRadius-1}px;`;
            p.controlsBox.y_align = Clutter.ActorAlign.START;
            vbox.add_child(p.controlsBox);
            vbox.add_child(new St.Widget({ y_expand: true }));
            if(this.showText) vbox.add_child(p.titleBox);
        }
        p.titleBox.style += `max-width: ${this.coverWidth-(this.coverRadius*2)-2}px`;

        p.mediaCover.set_child(vbox);
        p.add_child(p.mediaCover);

        if(this.showVolume){
            p.add_child(p.volumeBox); 
        }else{
            this.menu.box.add_style_class_name('full');
            this.menu.box.style = `border-radius: ${this.coverRadius-1}px;`
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
        let mpris = this.media.getPreferred();
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
        this.settings.connect('changed::media-player-cover-width', () => this._reload());
        this.settings.connect('changed::media-player-cover-height', () => this._reload());
        this.settings.connect('changed::media-player-cover-roundness', () => this._reload());
        this.settings.connect('changed::media-player-text-align', () => this._reload());
        this.settings.connect('changed::media-player-text-position', () => this._reload());
        this.settings.connect('changed::media-player-show-text', () => this._reload());
        this.settings.connect('changed::media-player-show-volume', () => this._reload());
        this.settings.connect('changed::media-player-show-loop-shuffle', () => this._reload());
        this.settings.connect('changed::media-player-prefer', () => this._reload());
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