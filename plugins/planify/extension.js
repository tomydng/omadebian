import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
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
        this._indicator.connect('button-press-event', (actor, event) => {
            if (event.get_button() !== Clutter.BUTTON_PRIMARY)
                return false;
            // Pattern borrowed from the AppIndicator extension: when
            // another panel menu holds the grab (e.g. the agents usage
            // popup), a click can be misrouted here. Only close that menu
            // and ignore the activation.
            if (Main.panel.menuManager.activeMenu) {
                Main.panel.menuManager._closeMenu(true, Main.panel.menuManager.activeMenu);
                return true;
            }
            // The shell's hover tracking can desync after a panel menu
            // grab: it then believes the pointer is over this icon while
            // the real pointer is elsewhere, and delivers the click with
            // "believed" coordinates. Compare the event position with the
            // real hardware pointer; a large gap means phantom click.
            const [ex, ey] = event.get_coords();
            const [px, py] = global.get_pointer();
            if (Math.abs(ex - px) > 30 || Math.abs(ey - py) > 30) {
                log(`planify-launcher: ignored desynced click, event at ${ex},${ey} but pointer at ${px},${py}`);
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
