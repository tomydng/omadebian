import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const WG_DIR = '/etc/wireguard';

export default class WireGuardExtension extends Extension {
    enable() {
        // name -> {item, id} where id is the 'toggled' handler. All
        // programmatic setToggleState calls MUST go through _setSwitch,
        // which blocks the handler: PopupSwitchMenuItem re-emits
        // 'toggled' on state changes, and acting on that emission caused
        // an infinite spawn loop (a fork bomb of pkexec processes).
        this._items = new Map();
        this._inflight = new Set();

        // 0.5 centers the popup menu under the icon.
        this._indicator = new PanelMenu.Button(0.5, 'WireGuard');
        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(`${this.path}/icons/wireguard.svg`),
            style_class: 'system-status-icon',
        });
        box.add_child(this._icon);
        this._indicator.add_child(box);

        this._header = new PopupMenu.PopupMenuItem(_('WireGuard profiles'));
        this._header.setSensitive(false);
        this._indicator.menu.addMenuItem(this._header);

        this._section = new PopupMenu.PopupMenuSection();
        this._indicator.menu.addMenuItem(this._section);
        this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._indicator.menu.addAction(_('Refresh'), () => {
            this._loadProfiles();
            this._pollStates();
        });

        Main.panel.addToStatusArea(this.uuid, this._indicator, 11, 'right');

        this._openId = this._indicator.menu.connect('open-state-changed',
            (menu, open) => {
                if (open)
                    this._pollStates();
            });

        // Profile listing is unprivileged (install.sh makes /etc/wireguard
        // world-listable; the .conf files stay root-only), so nothing here
        // can trigger a polkit prompt.
        this._loadProfiles();

        // Keep the icon state (dim when disconnected) fresh without
        // opening the menu. The check is unprivileged and cheap.
        this._pollId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5,
            () => {
                this._pollStates();
                return GLib.SOURCE_CONTINUE;
            });
        this._pollStates();
    }

    disable() {
        if (this._pollId) {
            GLib.source_remove(this._pollId);
            this._pollId = null;
        }
        if (this._openId && this._indicator)
            this._indicator.menu.disconnect(this._openId);
        this._openId = null;
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._icon = null;
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
            const id = item.connect('toggled', (it, wantUp) => {
                if (this._inflight.has(name))
                    return;
                this._toggle(name, wantUp);
            });
            this._section.addMenuItem(item);
            this._items.set(name, {item, id});
        }
    }

    _setSwitch(name, state) {
        const entry = this._items.get(name);
        if (!entry)
            return;
        if (entry.item.state === state)
            return;
        GObject.signal_handler_block(entry.item, entry.id);
        try {
            entry.item.setToggleState(state);
        } finally {
            GObject.signal_handler_unblock(entry.item, entry.id);
        }
    }

    _pollStates() {
        try {
            const flags = GLib.SpawnFlags.SEARCH_PATH |
                          GLib.SpawnFlags.DO_NOT_REAP_CHILD;
            const res = GLib.spawn_async_with_pipes(null,
                ['ip', '-o', 'link', 'show', 'type', 'wireguard'],
                null, flags, null);
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
                        GLib.spawn_close_pid(res[1]);
                        this._applyStates(lines.join('\n'));
                    }
                });
            readLine();
        } catch (e) {
            log(`wireguard: ip failed: ${e}`);
            this._applyStates('');
        }
    }

    _applyStates(out) {
        const active = new Set();
        for (const match of out.matchAll(/^\d+:\s*([\w.-]+):/gm))
            active.add(match[1]);

        // Dim the dragon while no tunnel is up.
        if (this._icon)
            this._icon.set_opacity(active.size > 0 ? 255 : 140);

        for (const name of this._items.keys())
            this._setSwitch(name, active.has(name));
    }

    _toggle(name, wantUp) {
        if (this._inflight.has(name))
            return;
        this._inflight.add(name);

        const entry = this._items.get(name);
        if (entry)
            entry.item.setSensitive(false);

        // Close the menu before spawning: no grab should be held while a
        // privileged command runs.
        this._indicator.menu.close();

        try {
            const argv = ['pkexec', 'wg-quick', wantUp ? 'up' : 'down', name];
            const flags = GLib.SpawnFlags.SEARCH_PATH |
                          GLib.SpawnFlags.DO_NOT_REAP_CHILD;
            const [, pid] = GLib.spawn_async(null, argv, null, flags, null);
            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (p, status) => {
                GLib.spawn_close_pid(p);
                this._inflight.delete(name);
                if (entry)
                    entry.item.setSensitive(true);
                this._pollStates();
            });
        } catch (e) {
            log(`wireguard: failed to run wg-quick: ${e}`);
            this._inflight.delete(name);
            if (entry)
                entry.item.setSensitive(true);
            this._pollStates();
        }
    }
}
