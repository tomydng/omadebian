import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const WG_DIR = '/etc/wireguard';

export default class WireGuardExtension extends Extension {
    enable() {
        this._items = new Map();
        this._syncing = false;

        this._indicator = new PanelMenu.Button(0.0, 'WireGuard');
        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        box.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${this.path}/icons/wireguard.svg`),
            style_class: 'system-status-icon',
        }));
        this._indicator.add_child(box);

        this._header = new PopupMenu.PopupMenuItem(_('WireGuard profiles'));
        this._header.setSensitive(false);
        this._indicator.menu.addMenuItem(this._header);

        this._section = new PopupMenu.PopupMenuSection();
        this._indicator.menu.addMenuItem(this._section);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._indicator.menu.addAction(_('Refresh'), () => {
            this._loadProfiles();
            this._refreshStates();
        });

        Main.panel.addToStatusArea(this.uuid, this._indicator, 11, 'right');

        this._openId = this._indicator.menu.connect('open-state-changed',
            (menu, open) => {
                if (open)
                    this._refreshStates();
            });

        // Profile listing is unprivileged (install.sh makes /etc/wireguard
        // world-listable; the .conf files stay root-only), so nothing here
        // can trigger a polkit prompt.
        this._loadProfiles();
    }

    disable() {
        if (this._openId && this._indicator)
            this._indicator.menu.disconnect(this._openId);
        this._openId = null;
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._items.clear();
    }

    _loadProfiles() {
        this._section.removeAll();
        this._items.clear();

        const names = [];
        try {
            const dir = Gio.File.new_for_path(WG_DIR);
            const iter = dir.enumerate_children('standard::name',
                Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = iter.next_file(null)) !== null) {
                const name = info.get_name();
                if (name.endsWith('.conf'))
                    names.push(name.slice(0, -'.conf'.length));
            }
            iter.close(null);
        } catch (e) {
            log(`wireguard: cannot list ${WG_DIR}: ${e}`);
        }
        names.sort();

        if (names.length === 0) {
            const empty = new PopupMenu.PopupMenuItem(
                _('No profiles in /etc/wireguard'));
            empty.setSensitive(false);
            this._section.addMenuItem(empty);
            return;
        }
        for (const name of names) {
            const item = new PopupMenu.PopupSwitchMenuItem(name, false);
            item.connect('toggled', (it, wantUp) => {
                if (this._syncing)
                    return;
                this._toggle(name, wantUp, it);
            });
            this._section.addMenuItem(item);
            this._items.set(name, item);
        }
    }

    _refreshStates() {
        // Interface state is readable without privileges.
        let out = '';
        try {
            const [, stdout] = GLib.spawn_command_line_sync(
                'ip -o link show type wireguard');
            out = new TextDecoder().decode(stdout);
        } catch (e) {
            out = '';
        }
        const active = new Set();
        for (const match of out.matchAll(/^\d+:\s*([\w.-]+):/gm))
            active.add(match[1]);

        this._syncing = true;
        for (const [name, item] of this._items)
            item.setToggleState(active.has(name));
        this._syncing = false;
    }

    _toggle(name, wantUp, item) {
        // Revert the switch until the command actually succeeds; the
        // refresh after completion sets the real state.
        item.setToggleState(!wantUp);
        item.setSensitive(false);

        // CRITICAL: close the menu before spawning pkexec. The polkit
        // password dialog is rendered by gnome-shell itself; keeping this
        // menu's modal grab open at the same time deadlocks the shell —
        // and with it the whole Wayland session.
        this._indicator.menu.close();

        try {
            const argv = ['pkexec', 'wg-quick', wantUp ? 'up' : 'down', name];
            const flags = GLib.SpawnFlags.SEARCH_PATH |
                          GLib.SpawnFlags.DO_NOT_REAP_CHILD;
            const [, pid] = GLib.spawn_async(null, argv, null, flags, null);
            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (p, status) => {
                GLib.spawn_close_pid(p);
                item.setSensitive(true);
                this._refreshStates();
            });
        } catch (e) {
            log(`wireguard: failed to run wg-quick: ${e}`);
            item.setSensitive(true);
            this._refreshStates();
        }
    }
}
