'use strict';

const { notify } = imports.ui.main;

const parentProperties = {
    x_align: 'int',
    y_align: 'int',
    x_offset: 'int',
    y_offset: 'int',
    darken: 'boolean'
}

const baseProperties = {
    x_align: 'int',
    y_align: 'int',
    x_expand: 'boolean',
    y_expand: 'boolean',
    width: 'int',
    height: 'int',
    background: 'boolean'
}

const modules = {
    apps: { 
        rows: 'int',
        cols: 'int',
        icon_size: 'int'
    },
    clock: {
        vertical: 'boolean'
    },
    levels: {
        vertical: 'boolean',
        show_battery: 'boolean',
        show_storage: 'boolean',
        show_cpu: 'boolean',
        show_ram: 'boolean',
        show_temp: 'boolean'
    },
    links: {
        vertical: 'boolean',
        icon_size: 'int',
        urls: { name: 'string' }
    },
    media: {
        prefer: 'string',
        style: 'int',
        cover_width: 'int',
        cover_height: 'int',
        cover_roundness: 'int',
        show_text: 'boolean',
        text_align: 'int',
        text_position: 'int',
        show_volume: 'boolean',
        show_loop_shuffle: 'boolean'
    },
    settings: {
        vertical: 'boolean',
        icon_size: 'int'
    },
    system: {
        layout: 'int',
        icon_size: 'int'
    },
    user: {
        vertical: 'boolean',
        icon_roundness: 'int',
        icon_width: 'int',
        icon_height: 'int'
    }
}

function _parseAlign(align){
    switch (align) {
        case 'FILL': return 0;
        case 'START': return 1;
        case 'CENTER': return 2;
        case 'END': return 3;
        default: 
            _err('Invalid align value', 'Values: START CENTER END FILL');
            return 2;
    }
}

function _err(text, subtext){
    notify(text, subtext);
    log(text, subtext);
}

function _set(module, property, value, type, settings){
    log(`${module}-${property} was set to ${value}`);
    switch (type) {
        case 'int':
            settings.set_int(`dash-${module}-${property.replace('_','-')}`, value);
            break;
        case 'string':
            settings.set_string(`dash-${module}-${property.replace('_','-')}`, value);
            break;
        case 'boolean':
            settings.set_boolean(`dash-${module}-${property.replace('_','-')}`, value);
            break;
        default:
            _err('Error: could not set setting', `${module} ${property} couldn't be set to ${value}`);
            break;
    }
}

function _parseUrls(pairs, settings){
    let names = [];
    let urls = [];
    for (const name in pairs) { if (Object.hasOwnProperty.call(pairs, name)) {
        let url = pairs[name];
        names.push(name);
        urls.push(url);
    }}
    settings.set_strv('dash-links-names', names);
    settings.set_strv('dash-links-urls',  urls);
    log(`links-url was set to ${urls}`);
}

function _parseModule(module, values, settings){
    if(!modules[module])
        return _err(`Error: ${module} was not recognised`);

    for (const property in values) { if (Object.hasOwnProperty.call(values, property)) {
        if(property in modules[module] || property in baseProperties){
            let type = modules[module][property] || baseProperties[property];
            const value = values[property];
            if(property === 'urls')
                _parseUrls(value, settings);
            else if( property === 'x_align' || property === 'y_align' )
                _set(module, property, _parseAlign(value), type, settings);
            else
                _set(module, property, value, type, settings);
        }
        else{
            _err(`Error: ${property} was not recognised`, `${module} does not have this propery`);
        }
    }}
}

var parseJson = (json, settings) => {
    if(json.children){
        let newJson = {
            children: json.children,
            vertical: json.vertical || false
        };
        settings.set_string('dash-layout-json', JSON.stringify(newJson));
    }

    for (const property in json) { if (Object.hasOwnProperty.call(json, property)) {
        if(property in parentProperties){
            let type = parentProperties[property];
            const value = json[property];
            if( property === 'x_align' || property === 'y_align' )
                _set('board', property, _parseAlign(value), type, settings);
            else
                _set('board', property, value, type, settings);
        }
    }}

    if(json.modules){
        for (const module in json.modules) { if (Object.hasOwnProperty.call(json.modules, module)) {
            _parseModule(module, json.modules[module], settings);
        }}
    }
}