import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const LAUNCH_COMMAND = 'flatpak run io.github.alainm23.planify';

export default class PlanifyLauncherExtension extends Extension {
    enable() {
        this._indicator = new PanelMenu.Button(0.0, 'Planify', true);
        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        box.add_child(new St.Icon({
            icon_name: 'task-due-symbolic',
            style_class: 'system-status-icon',
        }));
        this._indicator.add_child(box);
        this._indicator.connect('button-press-event', () => {
            this._launch();
            return true;
        });
        // Insert deep enough to land inside the tray cluster at the end of
        // the right box; Top Bar Organizer appends unknown items there.
        Main.panel.addToStatusArea(this.uuid, this._indicator, 10, 'right');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    _launch() {
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
