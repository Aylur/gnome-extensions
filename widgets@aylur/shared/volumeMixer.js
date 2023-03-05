const { Clutter, Gio, GLib, GObject, St, Gvc } = imports.gi;
const Volume = imports.ui.status.volume
const { QuickSlider } = imports.ui.quickSettings;

const ApplicationStreamSlider = GObject.registerClass(
class ApplicationStreamSlider extends QuickSlider{
    _init(stream) {
        super._init();
        this._stream = stream;
        this._control = Volume.getMixerControl();
        this.slider.connect('notify::value',() => this._sliderChanged());
        this._stream.connectObject(
            'notify::is-muted', this._updateSlider.bind(this),
            'notify::volume',   this._updateSlider.bind(this),
            this
        );
        this.connect('destroy', this._onDestroy.bind(this));
        this.icon_name = this._stream.icon_name;
        this._updateSlider();
    }

    _onDestroy() {
        this._stream.disconnectObject(this);
    }

    _sliderChanged() {
        if (!this._stream) return;
        this._stream.volume = this.slider.value * this._control.get_vol_max_norm();
        this._stream.push_volume();
    }

    _updateSlider() {
        if (!this._stream) return;
        if(this._stream.is_muted)
            return this.slider.value = 0;
        
        this.slider.value = this._stream.volume / this._control.get_vol_max_norm();
    }
});
    

var VolumeMixer = GObject.registerClass(
class VolumeMixer extends St.BoxLayout{
    _init(){
        super._init({ vertical: true });
        
        this._applicationStreams = {};
        let control = Volume.getMixerControl();
        
        for (const stream of control.get_streams())
            this._streamAdded(control, stream.get_id());
        
        control.connectObject(
            'stream-added', this._streamAdded.bind(this),
            'stream-removed', this._streamRemoved.bind(this),
            this
        );
    }

    _streamAdded(control, id) {
        if (id in this._applicationStreams)
            return;

        const stream = control.lookup_stream_id(id);
        if (stream.is_event_stream || !(stream instanceof Gvc.MixerSinkInput))
            return;

        let slider = new ApplicationStreamSlider(stream);
        this._applicationStreams[id] = slider;
        this.add_child(slider);
    }

    _streamRemoved(control, id) {
        if (!id in this._applicationStreams)
            return;

        this._applicationStreams[id].destroy();
        delete this._applicationStreams[id];
    }

    _onDestroy() {
        Volume.getMixerControl().disconnectObject(this);
    }
});