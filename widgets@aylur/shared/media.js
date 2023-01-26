'use strict';

const { GObject, St, Gio, Clutter, Shell, GLib } = imports.gi;
const { Slider } = imports.ui.slider;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension()

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

const blackListVolumeSlider = [ 'Spot' ];

const MprisPlayer = GObject.registerClass({
    Signals: {
        'changed' : {},
        'closed': {}
    }
},
class MprisPlayer extends St.Widget {
    _init(busName) {
        super._init();

        this._mprisProxy = new MprisProxy(Gio.DBus.session, busName,
            '/org/mpris/MediaPlayer2',
            this._onMprisProxyReady.bind(this));
        this._playerProxy = new MprisPlayerProxy(Gio.DBus.session, busName,
            '/org/mpris/MediaPlayer2',
            this._onPlayerProxyReady.bind(this));

        this._busName = busName;
        this._trackArtists = [];
        this._trackTitle = '';
        this._trackCoverUrl = '';
        this._playBackStatus = '';
        this._canGoNext = false;
        this._canGoPrev = false; 
        this._canPlay = false;
        this._shuffle = false;
        this._loopStatus = '';
        this._volume = -1;
    }

    get busName(){ return this._busName; }
    get trackArtists(){ return this._trackArtists; }
    get trackTitle(){ return this._trackTitle; }
    get trackCoverUrl(){ return this._trackCoverUrl; }
    get playBackStatus(){ return this._playBackStatus; }
    get canGoNext(){ return this._canGoNext; }
    get canGoPrev(){ return this._canGoPrev; }
    get canPlay(){ return this._canPlay; }
    get shuffleStatus(){ return this._shuffle; }
    get loopStatus(){ return this._loopStatus; }
    get volume(){ return this._volume; }

    setVolume(value){ this._playerProxy.Volume = value; }

    playPause() { this._playerProxy.PlayPauseRemote(); }
    
    next() { this._playerProxy.NextRemote(); }
    
    previous() { this._playerProxy.PreviousRemote(); }
    
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
            this._mprisProxy.RaiseAsync().catch(logError);
    }

    _close() {
        this._mprisProxy.disconnectObject(this);
        this._mprisProxy = null;

        this._playerProxy.disconnectObject(this);
        this._playerProxy = null;

        this.emit('closed');
    }

    _onMprisProxyReady() {
        this._mprisProxy.connectObject('notify::g-name-owner',
            () => {
                if (!this._mprisProxy.g_name_owner)
                    this._close();
            }, this);
        if (!this._mprisProxy.g_name_owner)
            this._close();
    }

    _onPlayerProxyReady() {
        this._playerProxy.connectObject(
            'g-properties-changed', () => this._updateState(), this);
        this._updateState();
    }

    _updateState() {
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
        if (typeof this._shuffle !== 'boolean') {
            this._shuffle = null;
        }
        this._loopStatus = this._playerProxy.LoopStatus;
        if (typeof this._loopStatus !== 'string') {
            this._loopStatus = null;
        }
        this._volume = this._playerProxy.Volume;
        if(typeof this._volume !== 'number'){
            this._volume = -1;
        }

        this.emit('changed');
    }
});

var PlayerWidget = GObject.registerClass(
class PlayerWidget extends St.BoxLayout{
    _init(mpris, showLoopShuffle = true, roundness = 12){
        super._init({
            style_class: 'media-container',
            reactive: true
        });

        this.player = mpris;
        this.roundness = roundness;

        //control widgets
        this.mediaCover = new St.Button({
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'media-cover',
            reactive: true,
            can_focus: true,
        });
        this.mediaCover.connect('clicked', () => this.player.raise()),

        this._mediaTitle = new St.Label({ text: '' });
        this._mediaArtist = new St.Label({ text: '' });

        this._shuffleBtn   = this._addButton('media-playlist-shuffle-symbolic', () => this.player.shuffle(), true);
        this._prevBtn      = this._addButton('media-skip-backward-symbolic', () => this.player.previous());
        this._playPauseBtn = this._addButton('media-playback-start-symbolic', () => this.player.playPause());
        this._nextBtn      = this._addButton('media-skip-forward-symbolic', () => this.player.next());
        this._loopBtn      = this._addButton('media-playlist-repeat-symbolic', () => this.player.loop(), true);

        this._volumeIcon = new St.Icon({ icon_name: 'audio-volume-high-symbolic', });
        this._volumeSlider = new Slider(0);
        this._volumeSlider.connect('notify::value', () => this.player.setVolume(this._volumeSlider.value));
        
        //ui containers
        this.titleBox = new St.BoxLayout({
            vertical: true,
            style_class: 'media-title-box'
        });
        this._mediaTitle.y_align = Clutter.ActorAlign.END;
        this._mediaArtist.y_align = Clutter.ActorAlign.START;
        this.titleBox.add_child(this._mediaArtist);
        this.titleBox.add_child(this._mediaTitle);

        this.controlsBox = new St.BoxLayout({
            style_class: 'media-container media-controls',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        if(showLoopShuffle) this.controlsBox.add_child(this._shuffleBtn);
        this.controlsBox.add_child(this._prevBtn);
        this.controlsBox.add_child(this._playPauseBtn);
        this.controlsBox.add_child(this._nextBtn);
        if(showLoopShuffle) this.controlsBox.add_child(this._loopBtn);

        this.volumeBox = new St.BoxLayout({
            style_class: 'media-container media-volume',
        });
        this.volumeBox.add_child(this._volumeIcon);
        this.volumeBox.add_child(this._volumeSlider);

        //layout in MediaBox

        this.binding = this.player.connect('changed', () => this._sync());
        this.connect('destroy', () => this.player.disconnect(this.binding));

        this._sync();
    }

    _addButton(iconName, callback, secondary){
        let btn = new St.Button({
            can_focus: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'message-media-control',
            reactive: false,
            child: new St.Icon({
                icon_name: iconName
            })
        });
        if(secondary){
            btn.add_style_class_name('media-control-secondary')
        }
        btn.connect('clicked', callback);
        return btn;
    }

    _sync(){
        //artists - title
        this._mediaArtist.text = this.player.trackArtists.join(', ');
        this._mediaTitle.text = this.player.trackTitle;

        //track cover
        let path = Me.dir.get_path()+'/media/mpris-cache/';
        if(!GLib.file_test(path, GLib.FileTest.EXISTS))
            Gio.File.new_for_path(path).make_directory(null);

        let fname = path + `${this._mediaArtist.text}_${this._mediaTitle.text}`.replace(/[\*\?\"\<\>\|\#\:\?\']/g, '');
        let withCover = `
            border-radius: ${this.roundness}px;
            background-image: url("file://${fname}");
            background-size: cover;
        `;
        let noCover =`
            border-radius: ${this.roundness}px;
            background-image: url("file://${Me.dir.get_path()}/media/missing-cover-symbolic.svg");
        `;

        if(this.player.trackCoverUrl === '' || this.player.trackCoverUrl === '_'){
            this.mediaCover.style = noCover;
        }
        else if(GLib.file_test(fname, GLib.FileTest.EXISTS)){
            this.mediaCover.style = withCover;
        }else{
            //The reason for copying the file seemingly for no reason is that I use spotify
            //and sometimes it freezes gnome shell, while it is trying to
            //set the background-image for the widget.
            //Why not use St.Icon? Because I want to make it rounded.
            Gio.File.new_for_uri(this.player.trackCoverUrl).copy_async(
                Gio.File.new_for_path(fname),
                Gio.FileCopyFlags.OVERWRITE,
                GLib.PRIORITY_DEFAULT,
                null,
                null,
                (source, result) => {
                    try {
                        source.copy_finish(result);
                        this.mediaCover.style = withCover;
                    } catch (e) {
                        this.mediaCover.style = noCover;
                    }
                }
            );
        }

        //next, prev, playPause buttons
        this.player.canGoNext ? this._nextBtn.reactive = true : this._nextBtn.reactive = false;
        this.player.canGoPrev ? this._prevBtn.reactive = true : this._prevBtn.reactive = false;
        
        if(this.player.canPlay){
            this._playPauseBtn.reactive = true;
            switch (this.player.playBackStatus) {
                case "Playing":
                    this._playPauseBtn.get_child().icon_name = 'media-playback-pause-symbolic';
                    break;
                case "Paused":
                    this._playPauseBtn.get_child().icon_name = 'media-playback-start-symbolic';
                    break;
                case "Stopped":
                    this._playPauseBtn.get_child().icon_name = 'media-playback-start-symbolic';
                    break;
                default:
                    break;
            }
        }else{
            this._playPauseBtn.reactive = false;
        }

        //shuffle button
        if(this.player.shuffleStatus !== null){
            this._shuffleBtn.reactive = true;
            this._shuffleBtn.show();
            if(this.player.shuffleStatus){
                this._shuffleBtn.remove_style_pseudo_class('insensitive');
            }else{
                this._shuffleBtn.add_style_pseudo_class('insensitive');
            }
        }else{
            this._shuffleBtn.reactive = false;
            this._shuffleBtn.hide();
        }

        //loop button
        if(this.player.loopStatus !== null){
            this._loopBtn.reactive = true;
            this._loopBtn.show();
            switch (this.player.loopStatus) {
                case "None":
                    this._loopBtn.get_child().icon_name = 'media-playlist-repeat-symbolic';
                    this._loopBtn.add_style_pseudo_class('insensitive');
                    break;
                case "Track":
                    this._loopBtn.get_child().icon_name = 'media-playlist-repeat-symbolic';
                    this._loopBtn.remove_style_pseudo_class('insensitive');
                    break;
                case "Playlist":
                    this._loopBtn.get_child().icon_name = 'media-playlist-repeat-song-symbolic';
                    this._loopBtn.remove_style_pseudo_class('insensitive');
                    break;
                default:
                    break;
            }
        }else{
            this._loopBtn.reactive = false;
            this._loopBtn.hide();
        }

        //volume
        let blackList = false;
        for (const item of blackListVolumeSlider) {
            if(this.player.busName.includes(item))
                blackList = true;
        }
        if(blackList || this.player.volume === -1){
            this.volumeBox.hide();
        }
        else{
            this.volumeBox.show();
            this._volumeSlider.value = this.player.volume;
            if(this.player.volume == 0) this._volumeIcon.icon_name = 'audio-volume-muted-symbolic';
            if(this.player.volume >= 0 && this.player.volume < 0.33 ) this._volumeIcon.icon_name = 'audio-volume-low-symbolic';
            if(this.player.volume >= 0.33 && this.player.volume < 0.66 ) this._volumeIcon.icon_name = 'audio-volume-medium-symbolic';
            if(this.player.volume >= 0.66 ) this._volumeIcon.icon_name = 'audio-volume-high-symbolic';
        }
    }
});

var Media = GObject.registerClass({
    Signals: { 'updated' : {} }
},
class Media extends St.Bin{
    _init(params, preferred) {
        super._init(params);
        this.preferred = preferred ? preferred : '';

        this._players = new Map();
        this._proxy = new DBusProxy(Gio.DBus.session,
                                    'org.freedesktop.DBus',
                                    '/org/freedesktop/DBus',
                                    this._onProxyReady.bind(this));
    }

    _addPlayer(busName) {
        if (this._players.get(busName))
            return;

        let player = new MprisPlayer(busName);
        player.connect('closed',
            () => {
                this._players.delete(busName);
                this.emit('updated');
            });
        this._players.set(busName, player);

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
    }

    _onNameOwnerChanged(proxy, sender, [name, oldOwner, newOwner]) {
        if (!name.startsWith('org.mpris.MediaPlayer2.'))
            return;
        if (newOwner && !oldOwner)
            this._addPlayer(name);
    }

    getPreferred(){
        if(this._players.size === 0){
            return false;
        }
        for (const [busName, player] of this._players) {
            if(busName.includes(this.preferred)){
                return player;
            }
        }
        const iterator = this._players.values();
        return iterator.next().value;
    }

    getPlayers(){
        let arr = [];
        for (const [busName, player] of this._players) {
            arr.push(player);
        }
        return arr;
    }
});


var MediaBox = GObject.registerClass(
class MediaBox extends Media{
    _init(settings, settingName){
        super._init({
            x_expand: true,
            y_expand: true,
            reactive: true
        });

        this.vertical = false;
        this.settings = settings;
        this.settingName = settingName;
        this._connections = [];
        this._connect('cover-width');
        this._connect('cover-height');
        this._connect('cover-roundness');
        this._connect('show-loop-shuffle');
        this._connect('show-text');
        this._connect('text-align');
        this._connect('text-position');
        this._connect('show-volume');
        this._connect('style');
        this._connect('prefer');

        this.connect('updated', () => this._sync());
        this.connect('destroy', this._onDestroy.bind(this));
        this._sync();
    }

    _onDestroy(){
        this._connections.forEach(c => 
            this.settings.disconnect(c)
        );
    }

    _connect(name){
        this._connections.push(
            this.settings.connect(`changed::${this.settingName}-${name}`,
                () => this._sync()
            )
        )
    }

    _sync(){
        this.preferred = this.settings.get_string(`${this.settingName}-prefer`);
        this.coverRadius = this.settings.get_int(`${this.settingName}-cover-roundness`);
        let secondary = this.settings.get_boolean(`${this.settingName}-show-loop-shuffle`);
        let mpris = this.getPreferred();
        if(mpris){
            this.player = new PlayerWidget(mpris, secondary, this.coverRadius);
            this._buildPlayerUI();
            this.set_child(this.player);
            this.show();
        }
        else this._onNoPlayer();
    }

    _onNoPlayer(){
        this.hide();
    }

    _buildPlayerUI(){
        this.player.mediaCover.width = this.settings.get_int(`${this.settingName}-cover-width`);
        this.player.mediaCover.height = this.settings.get_int(`${this.settingName}-cover-height`);
        let align = this.settings.get_int(`${this.settingName}-text-align`);
        let talign = 'center';
        switch (align) {
            case 1: talign = 'center'; align = Clutter.ActorAlign.CENTER; break;
            case 2: talign = 'right'; align = Clutter.ActorAlign.END; break;
            default: talign = 'left'; align = Clutter.ActorAlign.START; break;
        }
        this.player.titleBox.x_align = align;
        this.player.titleBox.style = `text-align: ${talign};`;
        this.textPosition = this.settings.get_int(`${this.settingName}-text-position`);
        this.showText = this.settings.get_boolean(`${this.settingName}-show-text`);
        this.showVolume = this.settings.get_boolean(`${this.settingName}-show-volume`);
        this.layout = this.settings.get_int(`${this.settingName}-style`);
    }

    _normal(vertical = true){
        let p = this.player;
        p.vertical = vertical;
        let vbox = new St.BoxLayout({
            style_class: 'media-container',
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        if(this.showText) vbox.add_child(p.titleBox);
        vbox.add_child(p.controlsBox);
        if(this.showVolume)
            vbox.add_child(p.volumeBox);
        p.add_child(p.mediaCover);
        p.add_child(vbox);
        p.y_align = Clutter.ActorAlign.CENTER;
    }

    _labelOnCover(vertical = true){
        let p = this.player;
        
        p.titleBox.width = p.mediaCover.width;
        let vbox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
        });
        if(this.textPosition == 0){
            p.titleBox.add_style_class_name('fade-from-top');
            p.titleBox.style += `border-radius: ${this.coverRadius-1}px ${this.coverRadius-1}px 0 0;`;
            if(this.showText) vbox.add_child(p.titleBox);
            vbox.add_child(new St.Widget({ y_expand: true }));
        }
        else{
            p.titleBox.add_style_class_name('fade-from-bottom');
            p.titleBox.style += `border-radius: 0 0 ${this.coverRadius-1}px ${this.coverRadius-1}px;`;
            vbox.add_child(new St.Widget({ y_expand: true }));
            if(this.showText) vbox.add_child(p.titleBox);
        }
        p.mediaCover.set_child(vbox);

        p.vertical = true;
        p.controlsBox.vertical = !vertical;
        let box = new St.BoxLayout({
            vertical: vertical,
            style_class: 'media-container'
        });
        box.add_child(p.mediaCover);
        box.add_child(p.controlsBox);

        p.add_child(box);

        if(this.showVolume){
           p.add_child(p.volumeBox); 
        }
    }

    _full(){
        let p = this.player;
        p.vertical = true;

        p.controlsBox.width = p.mediaCover.width;
        p.controlsBox.insert_child_at_index(new St.Widget({ x_expand: true }),0);
        p.controlsBox.add_child(new St.Widget({ x_expand: true }));
        p.titleBox.width = p.mediaCover.width;
        let vbox = new St.BoxLayout({ vertical: true, x_expand: true, y_expand: true });
        if(this.textPosition == 0){
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
        }
    }
});