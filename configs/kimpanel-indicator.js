import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Params from 'resource:///org/gnome/shell/misc/params.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Lib from './lib.js'

export class KimIndicator extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    _init(params) {
        super._init(0.5, 'kimpanel');
        params = Params.parse(params, {kimpanel : null});
        this._properties = {};
        this._propertySwitch = {};

        let hbox =
            new St.BoxLayout({style_class : 'panel-status-menu-box'});
        this.labelIcon =
            new St.Label({
                y_align : Clutter.ActorAlign.CENTER,
                x_align : Clutter.ActorAlign.CENTER
            });
        this.labelIcon.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.labelIcon.clutter_text.line_wrap = false;
        // EVKey-style badge: a fixed-size colored square around the
        // language letter, so "E" and "V" have exactly the same size and
        // the panel does not shift when switching input methods.
        // St.Bin is used because it honors the child's alignment
        // (BoxLayout does not), keeping the letter perfectly centered.
        // y_expand must be false, otherwise the badge stretches to fill
        // the full panel height.
        this.badgeBox = new St.Bin({
            y_align : Clutter.ActorAlign.START,
            y_expand : false
        });
        this.badgeBox.add_child(this.labelIcon);
        this.mainIcon = new St.Icon({
            gicon : Lib.createIcon('input-keyboard'),
            style_class : 'system-status-icon'
        });
        hbox.add_child(this.badgeBox);
        hbox.add_child(this.mainIcon);
        this.add_child(hbox);
        this._deactive();

        this.kimpanel = params.kimpanel;

        let settingMenu = new PopupMenu.PopupMenuItem(_("Settings"));
        settingMenu.connect('activate',
                            () => this.kimpanel.emit('Configure'));
        let reloadMenu =
            new PopupMenu.PopupMenuItem(_("Reload Configuration"));
        reloadMenu.connect('activate',
                           () => this.kimpanel.emit('ReloadConfig'));

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(reloadMenu);
        this.menu.addMenuItem(settingMenu);
        this.hide();
    }

    destroy() {
        this.kimpanel = null;
        this.badgeBox.destroy();
        this.labelIcon.destroy();
        this.mainIcon.destroy();
        super.destroy();
    }

    _addPropertyItem(key) {
        if (!(key in this._properties)) {
            return;
        }
        let property = this._properties[key];
        let item = Lib.createMenuItem(property);

        item._menuItemActivateId = item.connect(
            'activate', () => this.kimpanel.triggerProperty(item._key));
        item._menuItemDestroyId = item.connect('destroy', () => {
            item.disconnect(item._menuItemActivateId);
            item.disconnect(item._menuItemDestroyId);
        });
        item.setIcon(property.icon);
        item.label.text = property.label;

        this._propertySwitch[key] = item;
        this.menu.addMenuItem(this._propertySwitch[key],
                              this.menu.numMenuItems - 3);
    }

    _updatePropertyItem(key) {
        let property = this._properties[key];
        let item = this._propertySwitch[key];
        item.setIcon(property.icon);
        item.label.text = property.label;
    }

    _updateProperty(propstr) {
        let property = Lib.parseProperty(propstr);
        if (property == null) {
            return;
        }
        let key = property.key;
        this._properties[key] = property;
        this._updateProperties();
    }

    _updateProperties(properties) {
        if (properties == undefined) {
            for (let key in this._propertySwitch) {
                let property = this._properties[key];
                let item = this._propertySwitch[key];
                item.setIcon(property.icon);
                item.label.text = property.label;
            }
            return;
        } else {
            for (let p in this._propertySwitch) {
                if (properties[p] == undefined) {
                    this._propertySwitch[p].destroy();
                    delete this._propertySwitch[p];
                }
            }

            let count = 0;
            for (let p in properties) {
                let property = Lib.parseProperty(properties[p]);
                if (property == null) {
                    continue;
                }
                count++;
                let key = property.key;
                this._properties[key] = property;
                if (key in this._propertySwitch)
                    this._updatePropertyItem(key);
                else
                    this._addPropertyItem(key);
            }
            if (count > 0) {
                this.show();
            } else {
                this.hide();
            }
        }
    }

    _setIcon(property) {
        // EVKey-style indicator: a single letter with its own color
        // ("V" on red for Vietnamese, "E" on blue for English), inside a
        // fixed-size badge so switching input methods never shifts the
        // panel items. Themed/colored icons from fcitx5 are never used.
        const iconName = (property.icon || '').toLowerCase();
        const label = property.label || '';
        const isVi = /unikey/.test(iconName) || /^unikey/i.test(label);
        // The deactive state sends only the generic keyboard icon: show
        // the neutral symbolic icon instead of a badge then.
        const isFallback = !label &&
                           (!iconName || iconName === 'input-keyboard');

        if (!isFallback) {
            this.badgeBox.set_style(isVi
                ? 'width: 21px; padding: 0px; margin-top: 7px; border-radius: 3px; ' +
                  'background-color: #e53935; color: #ffffff; ' +
                  'font-size: 15px; font-weight: bold;'
                : 'width: 21px; padding: 0px; margin-top: 7px; border-radius: 3px; ' +
                  'background-color: #1e88e5; color: #ffffff; ' +
                  'font-size: 15px; font-weight: bold;');
            this.labelIcon.text = isVi ? 'V' : 'E';
            this.badgeBox.show();
            this.mainIcon.visible = false;
            return;
        }

        // No input-method info available: fall back to a symbolic icon.
        let gicon = Lib.createIcon('input-keyboard');
        this.mainIcon.gicon = gicon;
        this.mainIcon.visible = true;
        this.badgeBox.hide();
    }

    _active() {
        if (this._properties['/Fcitx/im']) {
            this._setIcon(this._properties['/Fcitx/im']);
        } else {
            self._deactive()
        }
    }

    _deactive() {
        let property = {
            'icon' : 'input-keyboard',
            'label' : '',
            'text' : '',
            'key' : '',
            'hint' : [],
        };

        this._setIcon(property);
    }
}
