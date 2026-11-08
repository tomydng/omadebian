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
        this._profiles = [];
        this._items = new Map();
        this._syncing = false;

        this._indicator = new PanelMenu.Button(0.0, 'WireGuard');
        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        const icon = new St.Icon({
            gicon: Gio.icon_new_for_string(`${this.path}/icons/wireguard.svg`),
            style_class: 'system-status-icon',
        });
        icon.set_style('-st-icon-style: symbolic;');
        box.add_child(icon);
        this._indicator.add_child(box);

        this._section = new PopupMenu.PopupMenuSection();
        this._indicator.menu.addMenuItem(this._section);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._indicator.menu.addAction(_('Refresh'), () => this._loadProfiles());

        Main.panel.addToStatusArea(this.uuid, this._indicator, 11, 'right');

        this._openId = this._indicator.menu.connect('open-state-changed',
            (menu, open) => {
                if (open)
                    this._refreshStates();
            });

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

    _spawn(argv, collectStdout, cb) {
        try {
            const flags = GLib.SpawnFlags.SEARCH_PATH |
                          GLib.SpawnFlags.DO_NOT_REAP_CHILD;
            const res = collectStdout
                ? GLib.spawn_async_with_pipes(null, argv, null, flags, null)
                : GLib.spawn_async(null, argv, null, flags, null);
            const pid = res[1];

            const watchExit = lines => GLib.child_watch_add(
                GLib.PRIORITY_DEFAULT, pid, (p, status) => {
                    GLib.spawn_close_pid(p);
                    cb(status, lines);
                });

            if (!collectStdout) {
                watchExit(null);
                return;
            }

            const decoder = new TextDecoder();
            const stream = new Gio.DataInputStream({
                base_stream: new Gio.UnixInputStream({fd: res[3], close_fd: true}),
            });
            const lines = [];
            const readLine = () => stream.read_line_async(
                GLib.PRIORITY_DEFAULT, null, (s, result) => {
                    const [line, length] = stream.read_line_finish(result);
                    if (line !== null) {
                        if (length > 0)
                            lines.push(decoder.decode(line));
                        readLine();
                    } else {
                        stream.close(null);
                        watchExit(lines);
                    }
                });
            readLine();
        } catch (e) {
            log(`wireguard: failed to run ${argv.join(' ')}: ${e}`);
            cb(-1, null);
        }
    }

    _loadProfiles() {
        this._section.removeAll();
        this._items.clear();
        const loading = new PopupMenu.PopupMenuItem(_('Loading profiles…'));
        loading.setSensitive(false);
        this._section.addMenuItem(loading);

        // /etc/wireguard is root-only, so listing needs pkexec (the polkit
        // agent shows the password prompt; the bundled polkit rule uses
        // auth_keep so it is asked once per session).
        this._spawn(['pkexec', 'ls', WG_DIR], true, (status, lines) => {
            this._section.removeAll();
            if (status !== 0 || !lines) {
                const err = new PopupMenu.PopupMenuItem(
                    _('Could not list /etc/wireguard (auth cancelled?)'));
                err.setSensitive(false);
                this._section.addMenuItem(err);
                return;
            }
            this._profiles = lines.map(l => l.trim())
                .filter(n => n.endsWith('.conf'))
                .map(n => n.slice(0, -'.conf'.length))
                .sort();
            if (this._profiles.length === 0) {
                const empty = new PopupMenu.PopupMenuItem(
                    _('No profiles in /etc/wireguard'));
                empty.setSensitive(false);
                this._section.addMenuItem(empty);
                return;
            }
            for (const name of this._profiles) {
                const item = new PopupMenu.PopupSwitchMenuItem(name, false);
                item.connect('toggled', (it, wantUp) => {
                    if (this._syncing)
                        return;
                    this._toggle(name, wantUp, it);
                });
                this._section.addMenuItem(item);
                this._items.set(name, item);
            }
            this._refreshStates();
        });
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
        this._spawn(
            ['pkexec', 'wg-quick', wantUp ? 'up' : 'down', name],
            false,
            () => {
                item.setSensitive(true);
                this._refreshStates();
            });
    }
}
