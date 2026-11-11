import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Desired order of the right box, by statusArea role. Anything not listed
// (tray icons, late-loading extensions) keeps its relative order after the
// listed ones. Only set_child_at_index is used — no actor is reparented.
//
// Re-applying happens at most once per children-count change: a periodic
// unconditional sort made Multi Monitor Bar rebuild its mirrors endlessly
// (feedback storm), so v2 watches the count instead of the order.
const RIGHT_ORDER = [
    'agents@tomydng.local',
    'screenRecording',
    'screenSharing',
    'dwellClick',
    'TopHat',
    'keyboard',
    'clipboardIndicator',
    'a11y',
    'kimpanel',
    'quickSettings',
];

export default class PanelOrderExtension extends Extension {
    enable() {
        this._lastCount = -1;
        this._apply();
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2,
            () => {
                const count = Main.panel._rightBox?.get_children().length ?? 0;
                if (count !== this._lastCount)
                    this._apply();
                return GLib.SOURCE_CONTINUE;
            });
    }

    disable() {
        if (this._timerId) {
            GLib.source_remove(this._timerId);
            this._timerId = null;
        }
    }

    _apply() {
        const box = Main.panel._rightBox;
        if (!box)
            return;
        const children = box.get_children();
        this._lastCount = children.length;

        // Map each child to its statusArea role.
        const roles = new Map();
        for (const [role, indicator] of Object.entries(Main.panel.statusArea)) {
            if (indicator?.container)
                roles.set(indicator.container, role);
        }

        const rank = child => {
            const role = roles.get(child);
            if (!role)
                return RIGHT_ORDER.length + 1;
            // Tray icons sit right before quickSettings (GNOME-default look:
            // quickSettings touches the right corner).
            if (role.startsWith('appindicator'))
                return RIGHT_ORDER.indexOf('quickSettings') + 0.5;
            const idx = RIGHT_ORDER.indexOf(role);
            return idx === -1 ? RIGHT_ORDER.length : idx;
        };

        // Desired sequence: listed roles in order, the rest after in their
        // current relative order. Apply in one straight pass.
        const sorted = [...children].sort((a, b) => rank(a) - rank(b));
        sorted.forEach((child, i) => box.set_child_at_index(child, i));
    }
}
