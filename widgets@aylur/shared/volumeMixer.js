/* exported VolumeMixer */

const {Clutter, GObject, St, Gvc} = imports.gi;
const Volume = imports.ui.status.volume;
const Main = imports.ui.main;
const {QuickSlider} = imports.ui.quickSettings;

const ApplicationStreamSlider = GObject.registerClass(
class ApplicationStreamSlider extends QuickSlider {
    _init(stream, showDesc = true, showName = true) {
        super._init();
        this._stream = stream;
        this._control = Volume.getMixerControl();
        this.slider.connect('notify::value', () => this._sliderChanged());
        this._stream.connectObject(
            'notify::is-muted', this._updateSlider.bind(this),
            'notify::volume',   this._updateSlider.bind(this),
            this
        );
        this.connect('destroy', this._onDestroy.bind(this));
        this._icon.reactive = true;
        this._icon.track_hover = true;
        this._icon.icon_name = this._stream.icon_name;
        this._icon.connect('notify::hover', () => this._toggleHoverLabel());
        this.hoverLabel = new St.Label({
            style_class: 'dash-label',
            text: this._stream.get_name(),
        });
        this._updateSlider();

        this._sliderBin = this.child.get_child_at_index(1);
        this.child.remove_child(this._sliderBin);
        const box = new St.BoxLayout({vertical: true});
        if (showDesc || showName) {
            box.add_child(new St.Label({
                text: `${showName ? stream.get_name() : ''} ${showName && showDesc ? '-' : ''} ${showDesc ? stream.get_description() : ''}`,
            }));
        }

        box.add_child(this._sliderBin);
        this.child.insert_child_at_index(box, 1);
    }

    _onDestroy() {
        this._stream.disconnectObject(this);
    }

    _sliderChanged() {
        if (!this._stream)
            return;
        this._stream.volume = this.slider.value * this._control.get_vol_max_norm();
        this._stream.push_volume();
    }

    _updateSlider() {
        if (!this._stream)
            return;

        if (this._stream.is_muted) {
            this.slider.value = 0;
            return;
        }

        this.slider.value = this._stream.volume / this._control.get_vol_max_norm();
    }

    _toggleHoverLabel() {
        if (this._icon.hover) {
            Main.layoutManager.addTopChrome(this.hoverLabel);
            this.hoverLabel.opacity = 0;
            const [stageX, stageY] = this._icon.get_transformed_position();
            const iconWidth = this._icon.allocation.get_width();
            const labelWidth = this.hoverLabel.get_width();
            const xOffset = Math.floor((iconWidth - labelWidth) / 2);
            const x = Math.clamp(stageX + xOffset, 0, global.stage.width - labelWidth);
            const y = stageY - this.hoverLabel.height;
            this.hoverLabel.set_position(x, y);

            this.hoverLabel.ease({
                opacity: 255,
                duration: 300,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        } else {
            Main.layoutManager.removeChrome(this.hoverLabel);
        }
    }
});


var VolumeMixer = GObject.registerClass(
class VolumeMixer extends St.BoxLayout {
    _init(settings) {
        super._init({vertical: true});

        this._settings = settings;
        this._applicationStreams = new Map();
        settings.connectObject(
            'changed::quick-settings-app-volume-mixer-show-description', () => this._reset(),
            'changed::quick-settings-app-volume-mixer-show-name', () => this._reset(),
            this
        );

        this._control = Volume.getMixerControl();
        this._reset();

        this._control.connectObject(
            'stream-added', this._streamAdded.bind(this),
            'stream-removed', this._streamRemoved.bind(this),
            this
        );
    }

    _reset() {
        this._showDesc = this._settings.get_boolean('quick-settings-app-volume-mixer-show-description');
        this._showName = this._settings.get_boolean('quick-settings-app-volume-mixer-show-name');

        for (const [id, _] of this._applicationStreams)
            this._streamRemoved(this._control, id);

        for (const stream of this._control.get_streams())
            this._streamAdded(this._control, stream.get_id());
    }

    _streamAdded(control, id) {
        if (this._applicationStreams.has(id))
            return;

        const stream = control.lookup_stream_id(id);
        if (stream.is_event_stream || !(stream instanceof Gvc.MixerSinkInput))
            return;

        const slider = new ApplicationStreamSlider(stream, this._showDesc, this._showName);
        this._applicationStreams.set(id, slider);
        this.add_child(slider);
    }

    _streamRemoved(_, id) {
        if (!this._applicationStreams.has(id))
            return;

        this._applicationStreams.get(id).destroy();
        this._applicationStreams.delete(id);
    }

    _onDestroy() {
        for (const [_, slider] of this._applicationStreams)
            slider.destroy();

        this._applicationStreams.clear();
        Volume.getMixerControl().disconnectObject(this);
        this._settings.disconnectObject(this);
    }
});
