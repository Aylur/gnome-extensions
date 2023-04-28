const { Clutter, St, GObject, GLib } = imports.gi;

var LevelBar = GObject.registerClass(
class LevelBar extends St.BoxLayout{
    _init(props = {}){
        super._init({
            style_class: `level-bar ${props.style_class}`,
            pseudo_class: `${props.pseudo_class}`,
            y_expand: true,
            x_expand: true,
            x_align: props.x_align || Clutter.ActorAlign.FILL,
            y_align: props.y_align || Clutter.ActorAlign.FILL,
        });
        this._fillLevel = new St.Bin({
            style_class: 'level-fill',
            x_expand: true,
            y_expand: true,
        });
        this.add_child(this._fillLevel);
        this._value = props.value || 0;
        this.vertical = props.vertical || false;
        this.roundness = props.roundness || 0;
        this.zero = props.zero || 0;
        this._timeoutDelay = props.timeoutDelay || 80;

        this.connect('destroy', this._onDestroy.bind(this));
    }

    _onDestroy(){
        if (this._timeoutId){
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
    }

    set roundness(radii){
        this._roundness = radii;
        this.style = `border-radius: ${radii}px;`;
        this._fillLevel.style  = `border-radius: ${radii}px;`;
    }

    get value(){ return this._value }

    set value(value){
        this._value = value;
        this._repaint();
    }

    set vertical(vertical){
        this._vertical = vertical;
        if(vertical){
            this._fillLevel.x_align = Clutter.ActorAlign.FILL;
            this._fillLevel.y_align = Clutter.ActorAlign.END;
        }
        else{
            this._fillLevel.x_align = Clutter.ActorAlign.START;
            this._fillLevel.y_align = Clutter.ActorAlign.FILL;
        }
    }

    animate(value){
        this._value = value;
        this._repaint(true);
    }

    _repaint(animate = false){
        if (this._timeoutId){
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        if(!this.has_allocation()){
            this._timeoutId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT, this._timeoutDelay, () => this._repaint(animate));
            return;
        }

        if(this._value > 1) this._value = 1;
        if(this._value < 0) this._value = 0;

        if(this._vertical){
            let max = this.height;
            let zero = Math.min(this._roundness*2, this.width);
            zero = Math.max(zero, this.zero);
            let value = Math.floor( (max-zero)*this._value + zero );
            if(animate)
                this._fillLevel.ease({
                    height: value,
                    duration: 150,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD
                });
            else
                this._fillLevel.height = value;
        }
        else{
            let max = this.width;
            let zero = Math.min(this._roundness*2, this.height);
            zero = Math.max(zero, this.zero);
            let value = Math.floor( (max-zero)*this._value + zero );
            if(animate)
                this._fillLevel.ease({
                    width: value,
                    duration: 150,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD
                });
            else
                this._fillLevel.width = value;
        }
        
        return GLib.SOURCE_REMOVE;
    }
});

