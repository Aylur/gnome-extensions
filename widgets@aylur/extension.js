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
const GnomeVersion = Math.floor(imports.misc.config.PACKAGE_VERSION);

class Extension {
    constructor() {}
    enable() {
        this.settings = ExtensionUtils.getSettings();

        this.backgroundClock = new Me.imports.widgets.backgroundClock.Extension();
        this.batteryBar = new Me.imports.widgets.batteryBar.Extension();
        this.dashBoard = new Me.imports.widgets.dashBoard.Extension();
        this.dateMenuTweaks = new Me.imports.widgets.dateMenuTweaks.Extension();
        this.mediaPlayer = new Me.imports.widgets.mediaPlayer.Extension();
        this.notificationIndicator = new Me.imports.widgets.notificationIndicator.Extension();
        this.powerMenu = new Me.imports.widgets.powerMenu.Extension();
        this.workspaceIndicator = new Me.imports.widgets.workspaceIndicator.Extension();

        if(this.settings.get_boolean('background-clock')) this.toggleExtension(this.backgroundClock);
        if(this.settings.get_boolean('battery-bar')) this.toggleExtension(this.batteryBar);
        if(this.settings.get_boolean('dash-board')) this.toggleExtension(this.dashBoard);
        if(this.settings.get_boolean('date-menu-tweaks')) this.toggleExtension(this.dateMenuTweaks);
        if(this.settings.get_boolean('media-player')) this.toggleExtension(this.mediaPlayer);
        if(this.settings.get_boolean('notification-indicator')) this.toggleExtension(this.notificationIndicator);
        if(this.settings.get_boolean('power-menu')) this.toggleExtension(this.powerMenu);
        if(this.settings.get_boolean('workspace-indicator')) this.toggleExtension(this.workspaceIndicator);
        
        this.settings.connect('changed::background-clock', () => this.toggleExtension(this.backgroundClock));
        this.settings.connect('changed::battery-bar', () => this.toggleExtension(this.batteryBar));
        this.settings.connect('changed::dash-board', () => this.toggleExtension(this.dashBoard));
        this.settings.connect('changed::date-menu-tweaks', () => this.toggleExtension(this.dateMenuTweaks));
        this.settings.connect('changed::media-player', () => this.toggleExtension(this.mediaPlayer));
        this.settings.connect('changed::notification-indicator', () => this.toggleExtension(this.notificationIndicator));
        this.settings.connect('changed::power-menu', () => this.toggleExtension(this.powerMenu));
        this.settings.connect('changed::workspace-indicator', () => this.toggleExtension(this.workspaceIndicator));

        if(GnomeVersion >= 43){
            this.quickSettingsTweaks = new Me.imports.widgets.quickSettingsTweaks.Extension();
            if(this.settings.get_boolean('quick-settings-tweaks')) this.toggleExtension(this.quickSettingsTweaks);
            this.settings.connect('changed::quick-settings-tweaks', () => this.toggleExtension(this.quickSettingsTweaks));
        }

        this.dynamicPanel = new Me.imports.widgets.dynamicPanel.Extension();
        this.dynamicPanel.enable();
    }

    disable() {
        if(this.backgroundClock.enabled){ this.backgroundClock.disable(); this.backgroundClock.enabled = false; }
        if(this.batteryBar.enabled){ this.batteryBar.disable(); this.batteryBar.enabled = false; }
        if(this.dashBoard.enabled){ this.dashBoard.disable(), this.dashBoard.enabled = false; }
        if(this.dateMenuTweaks.enabled){ this.dateMenuTweaks.disable(); this.dateMenuTweaks.enabled = false; }
        if(this.mediaPlayer.enabled) { this.mediaPlayer.disable(); this.mediaPlayer.enabled = false; }
        if(this.notificationIndicator.enabled){ this.notificationIndicator.disable(); this.notificationIndicator.enabled = false; }
        if(this.powerMenu.enabled){ this.powerMenu.disable(); this.powerMenu.enabled = false; }
        if(this.workspaceIndicator.enabled){ this.workspaceIndicator.disable(); this.workspaceIndicator.enabled = false; }

        this.backgroundClock = null;
        this.batteryBar = null;
        this.dashBoard = null;
        this.dateMenuTweaks = null;
        this.notificationIndicator = null;
        this.mediaPlayer = null;
        this.powerMenu = null;
        this.workspaceIndicator = null;

        if(GnomeVersion >= 43){
            if(this.quickSettingsTweaks.enabled){ this.quickSettingsTweaks.disable(); this.quickSettingsTweaks.enabled = false; }
            this.quickSettingsTweaks = null;
        }

        this.dynamicPanel.disable();
        this.dynamicPanel = null;
    }

    toggleExtension(extension){
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
