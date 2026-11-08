import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const LAUNCH_COMMAND = 'flatpak run io.github.alainm23.planify';

export default class PlanifyLauncherExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new PanelMenu.Button(0.0, 'Planify', true);
        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        box.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${this.path}/icons/planify.svg`),
            style_class: 'system-status-icon',
        }));
        this._indicator.add_child(box);
        this._indicator.connect('button-press-event', () => {
            // Ignore phantom clicks: while another panel menu holds the
            // pointer grab, its release can be misrouted to arbitrary panel
            // buttons. Only act when the pointer is really over this icon.
            const [px, py] = global.get_pointer();
            const [ok, sx, sy] = this._indicator.get_transformed_position();
            const w = this._indicator.allocation.x2 - this._indicator.allocation.x1;
            const h = this._indicator.allocation.y2 - this._indicator.allocation.y1;
            if (!ok || px < sx || px > sx + w || py < sy || py > sy + h) {
                log(`planify-launcher: ignored phantom click at ${px},${py} (icon at ${sx},${sy} ${w}x${h})`);
                return true;
            }
            log('planify-launcher: BUTTON clicked');
            this._present();
            return true;
        });
        // Insert deep enough to land inside the tray cluster at the end of
        // the right box; Top Bar Organizer appends unknown items there.
        Main.panel.addToStatusArea(this.uuid, this._indicator, 10, 'right');

        Main.wm.addKeybinding('toggle-binding', this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => {
                log('planify-launcher: KEYBINDING fired');
                this._present();
            });
    }

    disable() {
        Main.wm.removeKeybinding('toggle-binding');
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }

    _planifyWindows() {
        return global.get_window_actors()
            .map(actor => actor.meta_window)
            .filter(win => {
                const wmClass = (win.get_wm_class() ?? '').toLowerCase();
                return wmClass.includes('planify') || wmClass.includes('alainm23');
            });
    }

    _present() {
        const windows = this._planifyWindows();
        if (windows.length > 0) {
            // Pick the most recently used window and MOVE it to the
            // current workspace (instead of switching the view to it),
            // then raise and focus it.
            const target = windows.reduce((a, b) =>
                a.get_user_time() > b.get_user_time() ? a : b);
            const active = global.workspace_manager.get_active_workspace();
            if (target.get_workspace() !== active) {
                target.change_workspace_by_index(
                    active.index(), false);
            }
            target.activate(global.get_current_time());
            return;
        }
        try {
            const [, argv] = GLib.shell_parse_argv(LAUNCH_COMMAND);
            GLib.spawn_async(null, argv, null,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null);
        } catch (e) {
            log(`planify-launcher: failed to launch: ${e}`);
        }
    }
}
