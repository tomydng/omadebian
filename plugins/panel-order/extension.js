import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Desired order of the right box, by statusArea role. Anything not listed
// (tray icons, late-loading extensions) keeps its relative order after the
// listed ones. Only set_child_at_index is used — no actor is reparented,
// so Multi Monitor Bar's mirrored panels are not disturbed.
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
        this._apply();
        // Extensions and tray icons register at unpredictable times; a light
        // periodic check re-applies the order whenever children change.
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3,
            () => {
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

        // Map each child to its statusArea role.
        const roles = {};
        for (const [role, indicator] of Object.entries(Main.panel.statusArea)) {
            if (indicator?.container)
                roles[indicator.container] = role;
        }

        const children = box.get_children();
        const indexed = children.map((child, position) => ({
            child,
            position,
            role: roles[child] ?? null,
        }));

        // Stable sort: listed roles first in RIGHT_ORDER sequence, everything
        // else after, preserving current relative order.
        const rankOf = item => {
            const idx = item.role ? RIGHT_ORDER.indexOf(item.role) : -1;
            return idx === -1 ? RIGHT_ORDER.length : idx;
        };
        const sorted = [...indexed].sort((a, b) =>
            (rankOf(a) - rankOf(b)) || (a.position - b.position));

        let changed = false;
        sorted.forEach((item, i) => {
            if (children[i] !== item.child) {
                box.set_child_at_index(item.child, i);
                changed = true;
            }
        });
        if (changed)
            box.queue_relayout();
    }
}
