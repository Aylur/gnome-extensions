/* This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Extensions = {
    backgroundClock: 'background-clock',
    batteryBar: 'battery-bar',
    dashBoard: 'dash-board',
    dateMenuTweaks: 'date-menu-tweaks',
    mediaPlayer: 'media-player',
    notificationIndicator: 'notification-indicator',
    powerMenu: 'power-menu',
    workspaceIndicator: 'workspace-indicator',
    dynamicPanel: 'dynamic-panel',
    windowHeaderbar: 'window-headerbar',
    quickSettingsTweaks: 'quick-settings-tweaks',
    stylishOSD: 'stylish-osd'
}

class Extension {
    constructor() {}
    enable() {
        const settings = ExtensionUtils.getSettings();

        for (const extension in Extensions) { if (Object.hasOwnProperty.call(Extensions, extension)) {
            const settings_key = Extensions[extension];
            
            this[extension] = new Me.imports.extensions[extension].Extension(settings);
            if(settings.get_boolean(settings_key))
                this._toggleExtension(this[extension]);
            
            settings.connect(`changed::${settings_key}`, () => {
                this._toggleExtension(this[extension]);
            });
        }}
    }

    disable() {
        for (const extension in Extensions) { if (Object.hasOwnProperty.call(Extensions, extension)) {
            if(this[extension].enabled){
                this[extension].disable();
                this[extension].enabled = false;
            }

            this[extension] = null;
        }}
    }

    _toggleExtension(extension){
        if(!extension.enabled){
            extension.enable();
            extension.enabled = true;
        }else{
            extension.disable();
            extension.enabled = false;
        }
    }
}

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
    return new Extension();
}
