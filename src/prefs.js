'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();
    log(settings.get_strv('dash-board-shortcut'));
    log(settings.get_strv('link-names'));
    log(settings.get_strv('link-urls'));
    
    // Create a preferences page and group
    const page = new Adw.PreferencesPage();
    const panelButtonGroup = new Adw.PreferencesGroup({ title: 'Panel Button', });
    const dashGroup = new Adw.PreferencesGroup({ title: 'Dash', });
    page.add(panelButtonGroup);
    page.add(dashGroup);


    //REPLACE ACTIVITIES BUTTON
    const replace = new Adw.ActionRow({ title: 'Replace Activities Button' });
    panelButtonGroup.add(replace);

    const replaceToggle = new Gtk.Switch({
        active: settings.get_boolean('replace-activities-button'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(
        'replace-activities-button',
        replaceToggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    replace.add_suffix(replaceToggle);
    replace.activatable_widget = replaceToggle;

    //HIDE PANEL BUTTON
    const hide = new Adw.ActionRow({ title: 'Hide' });
    panelButtonGroup.add(hide);

    const hideToggle = new Gtk.Switch({
        active: settings.get_boolean('hide-panel-button'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(
        'hide-panel-button',
        hideToggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    hide.add_suffix(hideToggle);
    hide.activatable_widget = hideToggle;

    //PANEL BUTTON LABEL
    const panelLabel = new Adw.ActionRow({ title: 'Label' });
    panelButtonGroup.add(panelLabel);

    const panelLabelEntry = new Gtk.Entry({ valign: Gtk.Align.CENTER, });
    panelLabelEntry.connect('activate',
        () => settings.set_string('panel-button-label', panelLabelEntry.buffer.text));
    settings.bind(
        'panel-button-label',
        panelLabelEntry.buffer,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );

    panelLabel.add_suffix(panelLabelEntry);
    panelLabel.activatable_widget = panelLabelEntry;

    //PANEL BUTTON ICON HIDE
    const iconHide = new Adw.ActionRow({ title: 'Hide Icon' });
    panelButtonGroup.add(iconHide);

    const iconHideToggle = new Gtk.Switch({
        active: settings.get_boolean('panel-button-icon-hide'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(
        'panel-button-icon-hide',
        iconHideToggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    iconHide.add_suffix(iconHideToggle);
    iconHide.activatable_widget = iconHideToggle;

    //PANEL BUTTON ICON
    const panelIcon = new Adw.ActionRow({ title: 'Icon Path' });
    panelButtonGroup.add(panelIcon);

    const panelIconEntry = new Gtk.Entry({ valign: Gtk.Align.CENTER, });
    panelIconEntry.connect('activate',
        () => settings.set_string('panel-button-icon-path', panelIconEntry.buffer.text));
    settings.bind(
        'panel-button-icon-path',
        panelIconEntry.buffer,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );

    panelIcon.add_suffix(panelIconEntry);
    panelIcon.activatable_widget = panelIconEntry;

    //PANEL BUTTON POSITION LCR
    const panelPosLCR = new Adw.ActionRow({ title: 'Position' });
    panelButtonGroup.add(panelPosLCR);

    const panelPosList = Gtk.DropDown.new_from_strings(["Left", "Center", "Right"]);
    panelPosList.valign = Gtk.Align.CENTER;
    settings.bind(
        'panel-button-position',
        panelPosList,
        'selected',
        Gio.SettingsBindFlags.DEFAULT
    );
    panelPosLCR.add_suffix(panelPosList);
    panelPosLCR.activatable_widget = panelPosList;

    //PANEL BUTTON OFFSET
    const panelButtonOffset = new Adw.ActionRow({ title: 'Offset' });
    panelButtonGroup.add(panelButtonOffset);

    const panelButtonOffsetSpinButton = Gtk.SpinButton.new_with_range(0, 12, 1);
    panelButtonOffsetSpinButton.valign = Gtk.Align.CENTER;
    settings.bind(
        'panel-button-position-offset',
        panelButtonOffsetSpinButton,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );
    panelButtonOffset.add_suffix(panelButtonOffsetSpinButton);
    panelButtonOffset.activatable_widget = panelButtonOffsetSpinButton;

    //DASH LAYOUT
    const dashLayout = new Adw.ActionRow({ title: 'Layout' });
    dashGroup.add(dashLayout);

    const dashLayoutSpinButton = Gtk.SpinButton.new_with_range(1, 3, 1);
    dashLayoutSpinButton.valign = Gtk.Align.CENTER;
    settings.bind(
        'dash-layout',
        dashLayoutSpinButton,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );
    dashLayout.add_suffix(dashLayoutSpinButton);
    dashLayout.activatable_widget = dashLayoutSpinButton;

    window.add(page);
}