'use strict';

const { GObject, St, Gio, Clutter, Shell } = imports.gi;
const { Slider } = imports.ui.slider;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension()
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const PlayerIFace =
`<node>
    <interface name="org.mpris.MediaPlayer2.Player">
        <property name='CanControl' type='b' access='read' />
        <property name='CanGoNext' type='b' access='read' />
        <property name='CanGoPrevious' type='b' access='read' />
        <property name='CanPlay' type='b' access='read' />
        <property name='CanPause' type='b' access='read' />
        <property name='Metadata' type='a{sv}' access='read' />
        <property name='PlaybackStatus' type='s' access='read' />
        <property name='Shuffle' type='b' access='readwrite' />
        <property name='LoopStatus' type='s' access='readwrite' />
        <property name='Volume' type='d' access='readwrite' />
        <property name="Position" type="x" access="read"/>
        <method name='PlayPause' />
        <method name='Next' />
        <method name='Previous' />
        <method name='Stop' />
        <method name='Play' />
    </interface>
</node>`;

const MprisIFace =
`<node>
    <interface name='org.mpris.MediaPlayer2'>
        <method name='Raise' />
        <method name='Quit' />
        <property name='CanQuit' type='b' access='read' />
        <property name='CanRaise' type='b' access='read' />
        <property name='Identity' type='s' access='read' />
        <property name='DesktopEntry' type='s' access='read' />
    </interface>
</node>`;

const MprisPlayerProxy = Gio.DBusProxy.makeProxyWrapper(PlayerIFace);
const MprisProxy = Gio.DBusProxy.makeProxyWrapper(MprisIFace);
const DBusProxy = Gio.DBusProxy.makeProxyWrapper(imports.misc.fileUtils.loadInterfaceXML('org.freedesktop.DBus'));

const Player = GObject.registerClass({
    Signals: {
        'closed': {
            flags: GObject.SignalFlags.RUN_FIRST,
        },
        'updated': {
            flags: GObject.SignalFlags.RUN_LAST,
        },
    }
},
class Player extends St.BoxLayout{
    _init(busName, settings){
        super._init({
            vertical: true,
            style_class: 'container'
        });
        this._mprisProxy = new MprisProxy(
            Gio.DBus.session,
            busName,
            '/org/mpris/MediaPlayer2',
            this._onMprisProxyReady.bind(this));
        this._playerProxy = new MprisPlayerProxy(
            Gio.DBus.session,
            busName,
            '/org/mpris/MediaPlayer2',
            this._onPlayerProxyReady.bind(this));

        this.settings = settings;

        this._busName = busName;
        this._trackArtists = [];
        this._trackTitle = '';
        this._trackCoverUrl = '';

        this._playBackStatus = '';
        this._canGoNext = false;
        this._canGoPrev = false; 
        this._canPlay = false;

        this._shuffle = '';
        this._loopStatus = '';

        this._volume = 0;

        this._position = 0;
        this._length = 0;

        //UI elements
        this.mediaCover = new St.Button({
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'media-cover button',
        });

        this.mediaTitle = new St.Label();
        this.mediaArtist = new St.Label();

        this.shuffleBtn   = new St.Button({ can_focus: true, y_align: Clutter.ActorAlign.CENTER, x_align: Clutter.ActorAlign.CENTER, style_class: 'message-media-control', });
        this.prevBtn      = new St.Button({ can_focus: true, y_align: Clutter.ActorAlign.CENTER, x_align: Clutter.ActorAlign.CENTER, style_class: 'message-media-control', });
        this.playPauseBtn = new St.Button({ can_focus: true, y_align: Clutter.ActorAlign.CENTER, x_align: Clutter.ActorAlign.CENTER, style_class: 'message-media-control', });
        this.nextBtn      = new St.Button({ can_focus: true, y_align: Clutter.ActorAlign.CENTER, x_align: Clutter.ActorAlign.CENTER, style_class: 'message-media-control', });
        this.loopBtn      = new St.Button({ can_focus: true, y_align: Clutter.ActorAlign.CENTER, x_align: Clutter.ActorAlign.CENTER, style_class: 'message-media-control', });

        this.shuffleIcon = new St.Icon({ icon_name: 'media-playlist-shuffle-symbolic', });
        this.prevIcon = new St.Icon({ icon_name: 'media-skip-backward-symbolic',       });
        this.playPauseIcon = new St.Icon({ icon_name: 'media-playback-start-symbolic', });
        this.nextIcon = new St.Icon({ icon_name: 'media-skip-forward-symbolic',        });
        this.loopIcon = new St.Icon({ icon_name: 'media-playlist-repeat-symbolic',     });

        this.shuffleBtn.set_child(this.shuffleIcon);
        this.prevBtn.set_child(this.prevIcon);
        this.playPauseBtn.set_child(this.playPauseIcon);
        this.nextBtn.set_child(this.nextIcon);
        this.loopBtn.set_child(this.loopIcon);

        this.volumeIcon = new St.Icon({ icon_name: 'audio-volume-high-symbolic', });
        this.volumeSlider = new Slider(0);

        this.bindings = [
            this.shuffleBtn.connect('clicked', () => this.shuffle() ),
            this.loopBtn.connect('clicked', () => this.loop() ),
            this.prevBtn.connect('clicked', () => this.prev() ),
            this.nextBtn.connect('clicked', () => this.next() ),
            this.playPauseBtn.connect('clicked', () => this.playPause() ),
            this.mediaCover.connect('clicked', () => this.raise() ),
            this.volumeSlider.connect('notify::value',
                                       () => { this._playerProxy.Volume = this.volumeSlider.value; }),
        ];

        //UI
        this.titleBox = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.titleBox.add_child(this.mediaTitle);
        this.titleBox.add_child(this.mediaArtist);

        this.controlsBox = new St.BoxLayout({
            style_class: 'container',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.controlsBox.add_child(this.shuffleBtn);
        this.controlsBox.add_child(this.prevBtn);
        this.controlsBox.add_child(this.playPauseBtn);
        this.controlsBox.add_child(this.nextBtn);
        this.controlsBox.add_child(this.loopBtn);

        this.volumeBox = new St.BoxLayout({
            style_class: 'container',
        });
        this.volumeBox.add_child(this.volumeIcon);
        this.volumeBox.add_child(this.volumeSlider);

        this.hbox = new St.BoxLayout({ style_class: 'container' });
        this.hbox.add_child(this.mediaCover);
        this.hbox.add_child(this.titleBox);

        this._buildUI();
    }
    _buildUI(){
        const layout = this.settings.get_int('media-player-layout');
        if(layout === 0){
            this.mediaCover.width = 230;
            this.mediaCover.height = 230;
            this.titleBox.style = 'text-align: center';
            this.hbox.vertical = true;
            this.add_child(this.hbox);
            this.add_child(this.controlsBox);
            this.add_child(this.volumeBox);
        }else{
            this.mediaCover.width = 70;
            this.mediaCover.height = 70;
            this.titleBox.style = '';
            this.hbox.vertical = false;
            this.add_child(this.hbox);
            this.add_child(this.controlsBox);
            this.add_child(this.volumeBox);
        }
    }
    _close() {
        this._mprisProxy.disconnectObject(this);
        this._mprisProxy = null;
        this._playerProxy.disconnectObject(this);
        this._playerProxy = null;

        this.emit('closed');
    }
    _onMprisProxyReady(){
        this._mprisProxy.connectObject('notify::g-name-owner',
            () => {
                if (!this._mprisProxy.g_name_owner)
                    this._close();
            }, this);
        if (!this._mprisProxy.g_name_owner)
            this._close();
    }
    _onPlayerProxyReady(){
        this._playerProxy.connectObject(
            'g-properties-changed', () => this._updateState(), this);
        this._updateState();
    }
    _updateState(){
        let metadata = {};
        for (let prop in this._playerProxy.Metadata)
            metadata[prop] = this._playerProxy.Metadata[prop].deep_unpack();

        this._trackArtists = metadata['xesam:artist'];
        if (!Array.isArray(this._trackArtists) ||
            !this._trackArtists.every(artist => typeof artist === 'string')) {
            this._trackArtists =  [_("Unknown artist")];
        }
        this._trackTitle = metadata['xesam:title'];
        if (typeof this._trackTitle !== 'string') {
            this._trackTitle = _("Unknown title");
        }
        this._trackCoverUrl = metadata['mpris:artUrl'];
        if (typeof this._trackCoverUrl !== 'string') {
            this._trackCoverUrl = '';
        }

        this._playBackStatus = this._playerProxy.PlaybackStatus;
        this._canGoNext = this._playerProxy.CanGoNext;
        this._canGoPrev = this._playerProxy.CanGoPrevious;
        this._canPlay = this._playerProxy.CanPlay;

        this._shuffle = this._playerProxy.Shuffle;
        this._loopStatus = this._playerProxy.LoopStatus;
        this._volume = this._playerProxy.Volume;
        if(typeof this._volume !== 'number'){
            this._volume = -1;
        }

        this._sync();
        this.emit('updated');
    }
    _sync(){
        this.mediaArtist.text = this._trackArtists.join(', ');
        this.mediaTitle.text = this._trackTitle;

        if(this._trackCoverUrl !== ''){
            this.mediaCover.remove_all_children();
            // this.mediaCover.style = 'background-image: url("' + this._trackCoverUrl + '"); background-size: cover;';
            let cover = new St.Icon({
                gicon: Gio.Icon.new_for_string(this._trackCoverUrl),
                icon_size: this.mediaCover.width-4,
            });
            this.mediaCover.set_child(cover);
        }
        else {
            this.mediaCover.remove_all_children();
            // this.mediaCover.style = 'background-image: none';
            let mediaCoverDummy = new St.Icon({
                icon_name: 'applications-multimedia-symbolic',
            });
            this.mediaCover.set_child(mediaCoverDummy);
        }

        if(this._canGoNext){
            this.nextBtn.reactive = true;
            this.nextBtn.remove_style_pseudo_class('insensitive');
        }else{
            this.nextBtn.reactive = false;
            this.nextBtn.add_style_pseudo_class('insensitive');
        }
        if(this._canGoPrev){
            this.prevBtn.reactive = true;
            this.prevBtn.remove_style_pseudo_class('insensitive');
        }else{
            this.prevBtn.reactive = false;
            this.prevBtn.add_style_pseudo_class('insensitive');
        }
        if(this._canPlay){
            this.playPauseBtn.reactive = true;
            this.playPauseBtn.remove_style_pseudo_class('insensitive');
            switch (this._playBackStatus) {
                case "Playing":
                    this.playPauseIcon.icon_name = 'media-playback-pause-symbolic';
                    break;
                case "Paused":
                    this.playPauseIcon.icon_name = 'media-playback-start-symbolic';
                    break;
                case "Stopped":
                    this.playPauseIcon.icon_name = 'media-playback-start-symbolic';
                    break;
                default:
                    break;
            }
        }else{
            this.playPauseBtn.reactive = false;
            this.playPauseBtn.add_style_pseudo_class('insensitive');
        }
        if(typeof this._shuffle !== 'undefined'){
            this.shuffleBtn.show();
            if(this._shuffle){
                this.shuffleBtn.remove_style_pseudo_class('insensitive');
            }else{
                this.shuffleBtn.add_style_pseudo_class('insensitive');
            }
        }else{
            this.shuffleBtn.hide();
        }
        if(typeof this._loopStatus !== 'undefined'){
            this.loopBtn.show();
            switch (this._loopStatus) {
                case "None":
                    this.loopIcon.icon_name = 'media-playlist-repeat-symbolic';
                    this.loopBtn.add_style_pseudo_class('insensitive');
                    break;
                case "Track":
                    this.loopIcon.icon_name = 'media-playlist-repeat-symbolic';
                    this.loopBtn.remove_style_pseudo_class('insensitive');
                    break;
                case "Playlist":
                    this.loopIcon.icon_name = 'media-playlist-repeat-song-symbolic';
                    this.loopBtn.remove_style_pseudo_class('insensitive');
                    break;
                default:
                    break;
            }
        }else{
            this.loopBtn.hide();
        }
        if(this._volume > -1){
            this.volumeBox.show();
            this.volumeSlider.value = this._volume;
            if(this._volume == 0) this.volumeIcon.icon_name = 'audio-volume-muted-symbolic';
            if(this._volume >= 0 && this._volume < 0.33 ) this.volumeIcon.icon_name = 'audio-volume-low-symbolic';
            if(this._volume >= 0.33 && this._volume < 0.66 ) this.volumeIcon.icon_name = 'audio-volume-medium-symbolic';
            if(this._volume >= 0.66 ) this.volumeIcon.icon_name = 'audio-volume-high-symbolic';
        }
        else{
            this.volumeBox.hide();
        }
    }
    playPause(){ this._playerProxy.PlayPauseRemote(); }
    next(){ this._playerProxy.NextRemote(); }
    prev(){ this._playerProxy.PreviousRemote(); }
    shuffle(){ this._playerProxy.Shuffle = !this._playerProxy.Shuffle; }
    loop(){
        switch (this._playerProxy.LoopStatus) {
          case "None":
              this._playerProxy.LoopStatus = "Track";
              break;
          case "Track":
              this._playerProxy.LoopStatus = "Playlist";
              break;
          case "Playlist":
              this._playerProxy.LoopStatus = "None";
              break;
          default:
              break;
        }
    }
    raise() {
        let app = null;
        if (this._mprisProxy.DesktopEntry) {
            let desktopId = `${this._mprisProxy.DesktopEntry}.desktop`;
            app = Shell.AppSystem.get_default().lookup_app(desktopId);
        }

        if (app)
            app.activate();
        else if (this._mprisProxy.CanRaise)
            this._mprisProxy.RaiseRemote();
    }
});

const Media = GObject.registerClass({
    Signals: {
        'updated': {
            flags: GObject.SignalFlags.RUN_FIRST,
        },
        'proxy-ready': {}
    }
}, class Media extends St.Bin{
    _init(settings){
        super._init();
        this.settings = settings;
        this._players = new Map();
        this._proxy = new DBusProxy(Gio.DBus.session,
                                    'org.freedesktop.DBus',
                                    '/org/freedesktop/DBus',
                                    this._onProxyReady.bind(this));

        this.connect('destroy', () => {
            for (const [busName, player] of this._players) {
                player.destroy();
                player = null;
            }
        });
    }
    _addPlayer(busName) {
        if (this._players.get(busName))
            return;

        let player = new Player(busName, this.settings);
        this._players.set(busName, player);
        player.connect('closed',
            () => {
                this._players.delete(busName);
                this.emit('updated');
            });
        player.connect('updated',
            () => this.emit('updated'));

        this.emit('updated');
    }
    _onProxyReady() {
        this._proxy.ListNamesRemote(([names]) => {
            names.forEach(name => {
                if (!name.startsWith('org.mpris.MediaPlayer2.'))
                    return;

                this._addPlayer(name);
            });
        });
        this._proxy.connectSignal('NameOwnerChanged',
                                  this._onNameOwnerChanged.bind(this));
        this.emit('proxy-ready');
    }
    _onNameOwnerChanged(proxy, sender, [name, oldOwner, newOwner]) {
        if (!name.startsWith('org.mpris.MediaPlayer2.'))
            return;
        if (newOwner && !oldOwner)
            this._addPlayer(name);
    }
    getFavPlayer(){
        if(this._players.size === 0){
            return false;
        }
        for (const [busName, player] of this._players) {
            if(busName.includes(this.settings.get_string('media-player-prefer'))){
                return player;
            }
        }
        const iterator = this._players.values();
        return iterator.next().value;
    }
});

const MediaButton = GObject.registerClass(
class MediaButton extends PanelMenu.Button{
    _init(media, settings){
        super._init(0.5, 'Media Player', false);
        
        this.hide();
        this.label = new St.Label({
            text: 'artist - title',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this.label);

        this.media = media;
        this.media.connect('updated', () => this.sync());

        this.playerBin = new St.Bin({ style_class: 'media-player-content' });
        this.menu.box.add_child(this.playerBin);

        let maxWidth = settings.get_int('media-player-max-width');
        if(maxWidth > 0) this.label.style = `max-width: ${maxWidth}px`;
    }
    sync(){
        let player = this.media.getFavPlayer();
        if(player){
            this.show();
            this.label.text = `${player._trackArtists.join(', ')} - ${player._trackTitle}`;
            this.playerBin.set_child(player);
        }else{
            this.hide();
        }
    }
});

const MediaControls = GObject.registerClass(
class MediaControls extends St.BoxLayout{
    _init(media){
        super._init({ visible: false });

        this.prevBtn = new St.Button({ style_class: 'panel-button', child: new St.Icon({ style_class: 'system-status-icon', icon_name: 'media-skip-backward-symbolic' }) });
        this.playBtn = new St.Button({ style_class: 'panel-button', child: new St.Icon({ style_class: 'system-status-icon', icon_name: 'media-playback-start-symbolic' }) });
        this.nextBtn = new St.Button({ style_class: 'panel-button', child: new St.Icon({ style_class: 'system-status-icon', icon_name: 'media-skip-forward-symbolic' }) });

        this.prevBtn.connect('clicked', () => this.player.prev());
        this.playBtn.connect('clicked', () => this.player.playPause());
        this.nextBtn.connect('clicked', () => this.player.next());

        this.add_child(this.prevBtn);
        this.add_child(this.playBtn);
        this.add_child(this.nextBtn);

        this.media = media;
        this.media.connect('updated', () => this.sync());
    }
    sync(){
        let player = this.media.getFavPlayer();
        if(player){
            this.show();
            this.player = player;

            player._canGoNext ? this.nextBtn.show() : this.nextBtn.hide();
            player._canGoPrev ? this.prevBtn.show() : this.prevBtn.hide();

            if(player._canPlay){
                this.playBtn.show();
                switch (player._playBackStatus) {
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
        }else{
            this.hide();
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
        this.settings.connect('changed::media-player-offset', () => this.reload());
        this.settings.connect('changed::media-player-position', () => this.reload());
        this.settings.connect('changed::media-player-layout', () => this.reload());
        this.settings.connect('changed::media-player-controls-position', () => this.reload());
        this.settings.connect('changed::media-player-controls-offset', () => this.reload());
        this.settings.connect('changed::media-player-hide-controls', () => this.reload());
        this.settings.connect('changed::media-player-max-width', () => this.reload());
        this.reload();

        this.stockMpris.visible = false;
        this.stockMpris._shouldShow = () => false;
    }

    disable() {
        this.media.destroy();
        this.panelButton.destroy();
        this.controls.destroy();
        this.media = null;
        this.panelButton = null;
        this.controls = null;
        this.settings = null;
        this.loaded = false;
        
        this.stockMpris._shouldShow = this.shouldShow;
        this.stockMpris.visible = this.stockMpris._shouldShow();
    }

    reload(){
        if(this.loaded){
            this.media.destroy();
            this.media = null;     
            this.panelButton.destroy();
            this.panelButton = null;
            this.controls.destroy();
            this.controls = null;
        }
        this.media = new Media(this.settings);
        this.panelButton = new MediaButton(this.media, this.settings);
        this.controls = new MediaControls(this.media);

        let trackPos = this.settings.get_int('media-player-position');
        let trackOffset = this.settings.get_int('media-player-offset');
        Main.panel.addToStatusArea('Media Player', this.panelButton, trackOffset, this.pos[trackPos]);

        let controlsPos = this.settings.get_int('media-player-controls-position');
        let controlsOffset = this.settings.get_int('media-player-controls-offset');
        if(!this.settings.get_boolean('media-player-hide-controls'))
            this.panelBox[controlsPos].insert_child_at_index(this.controls, controlsOffset);
    
        this.loaded = true;
    }
}