import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// Curated zones for the in-menu "Manage locations" switch list.
const ZONE_CATALOG = [
    'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo',
    'Asia/Seoul', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Kolkata',
    'Asia/Dubai', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Europe/Moscow', 'America/New_York', 'America/Chicago',
    'America/Los_Angeles', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

function splitLocation(entry) {
    const idx = entry.indexOf('|');
    const zoneId = idx === -1 ? entry : entry.slice(0, idx);
    const name = idx === -1 ? prettyZone(zoneId) : entry.slice(idx + 1);
    return {zoneId, name};
}

function prettyZone(zoneId) {
    if (zoneId === 'UTC')
        return 'UTC';
    // tzdata has a single Vietnam zone; label it after the capital.
    if (zoneId === 'Asia/Ho_Chi_Minh')
        return 'Hà Nội';
    return zoneId.split('/').pop().replace(/_/g, ' ');
}

function offsetText(dateTime) {
    const mins = Math.round(dateTime.get_utc_offset() / GLib.TIME_SPAN_MINUTE);
    const sign = mins < 0 ? '-' : '+';
    const abs = Math.abs(mins);
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// Whole days between the zone's local date and the user's local date:
// 1 -> Tomorrow, -1 -> Yesterday, 0 -> Today.
function dayDiff(zoneDate, localDate) {
    const [zy, zm, zd] = zoneDate.get_ymd();
    const [ly, lm, ld] = localDate.get_ymd();
    const a = GLib.DateTime.new(GLib.TimeZone.new('UTC'), zy, zm, zd, 12, 0, 0);
    const b = GLib.DateTime.new(GLib.TimeZone.new('UTC'), ly, lm, ld, 12, 0, 0);
    return Math.round(a.difference(b) / GLib.TIME_SPAN_DAY);
}

// Parse "15:30" / "3:30 pm" as a wall time in refZone. A time that has
// already passed today rolls over to tomorrow (the next occurrence).
// Returns {instant, text} or null for unparseable/out-of-range input.
function parseConvertText(text, refZone) {
    const m = text.trim().match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i);
    if (!m)
        return null;
    let hours = parseInt(m[1]);
    const mins = m[2] ? parseInt(m[2]) : 0;
    const ampm = m[3] ? m[3].toLowerCase() : null;
    if (ampm === 'pm' && hours < 12)
        hours += 12;
    if (ampm === 'am' && hours === 12)
        hours = 0;
    if (hours > 23 || mins > 59)
        return null;

    const now = GLib.DateTime.new_now(refZone);
    let dt = GLib.DateTime.new(refZone,
        now.get_year(), now.get_month(), now.get_day_of_month(), hours, mins, 0);
    if (dt.difference(now) < 0)
        dt = dt.add_days(1);
    return {instant: dt,
        text: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`};
}

const WorldClockIndicator = GObject.registerClass(
class WorldClockIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, 'World Clock', false);
        this._extension = extension;
        this._settings = extension.getSettings();
        this._rows = [];
        this._tickCount = 0;

        // Adwaita ships no globe symbolic, so the extension bundles its own.
        // Same glyph the Omarchy plugin uses: nf-md-earth from the Nerd
        // Font set (CaskaydiaMono ships it on this machine).
        this._icon = new St.Label({
            text: '󰖟',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._barLabel = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            style: 'font-weight: bold;',
        });
        this._box = new St.BoxLayout();
        this._box.add_child(this._icon);
        this._box.add_child(this._barLabel);
        this.add_child(this._box);
        // Symmetric padding like every other panel button — the pill and the
        // glyph stay centered, and the dateMenu button shrinks its own
        // padding (see enable) so the pair still sits tight together.
        this.style = '-natural-hpadding: 7px; -minimum-hpadding: 7px;';

        this._buildMenu();

        this._settingsChangedId = this._settings.connect('changed',
            () => this._buildMenu());
        this.menu.connect('open-state-changed', () => {
            if (this.menu.isOpen)
                this._refresh();
        });

        // Seconds tick keeps the clocks live while the menu is open; the
        // bar label (first-city mode) follows every ~15 s.
        this._refreshId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1,
            () => {
                this._tickCount = (this._tickCount + 1) % 15;
                if (this.menu.isOpen || this._tickCount === 0)
                    this._refresh();
                return GLib.SOURCE_CONTINUE;
            });
        this._refresh();
    }

    _buildMenu() {
        const menu = this.menu;
        menu.removeAll();
        this._rows = [];

        const locations = this._settings.get_strv('locations');
        if (locations.length === 0) {
            const empty = new PopupMenu.PopupMenuItem('No locations — enable some in Manage locations', {reactive: false});
            menu.addMenuItem(empty);
        }

        for (const entry of locations) {
            const {zoneId, name} = splitLocation(entry);
            let zone = null;
            try {
                zone = GLib.TimeZone.new(zoneId);
            } catch {
                zone = null;
            }
            if (!zone)
                continue;

            const row = new PopupMenu.PopupBaseMenuItem({reactive: false});
            const nameLabel = new St.Label({text: name, y_align: Clutter.ActorAlign.CENTER});
            nameLabel.x_expand = true;
            const timeLabel = new St.Label({
                text: '--:--',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-weight: bold;',
            });
            const dayLabel = new St.Label({
                text: '',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'opacity: 0.6; font-size: 0.85em;',
            });
            row.add_child(nameLabel);
            row.add_child(timeLabel);
            row.add_child(dayLabel);
            menu.addMenuItem(row);
            this._rows.push({zone, name, nameLabel, timeLabel, dayLabel});
        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Meeting-time converter: type a time in the first city's zone and
        // every row flips to show the matching local time there.
        this._convertHeader = new PopupMenu.PopupMenuItem('', {reactive: false});
        this._convertHeader.label.style = 'font-weight: bold;';
        menu.addMenuItem(this._convertHeader);

        const convertRow = new PopupMenu.PopupBaseMenuItem({reactive: false});
        this._convertEntry = new St.Entry({
            hint_text: 'e.g. 15:30 or 3:30 pm',
            style_class: 'search-entry',
            style: 'width: 210px;',
            x_expand: true,
        });
        convertRow.add_child(this._convertEntry);
        menu.addMenuItem(convertRow);
        this._convertEntry.clutter_text.connect('text-changed', () => this._refresh());

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const display = new PopupMenu.PopupSubMenuMenuItem('Display');
        menu.addMenuItem(display);
        const use24Switch = new PopupMenu.PopupSwitchMenuItem(
            '24-hour time', this._settings.get_boolean('use-24h'));
        use24Switch.connect('toggled',
            item => this._settings.set_boolean('use-24h', item.state));
        display.menu.addMenuItem(use24Switch);

        const offsetsSwitch = new PopupMenu.PopupSwitchMenuItem(
            'Show UTC offsets', this._settings.get_boolean('show-offsets'));
        offsetsSwitch.connect('toggled',
            item => this._settings.set_boolean('show-offsets', item.state));
        display.menu.addMenuItem(offsetsSwitch);

        const barModeSwitch = new PopupMenu.PopupSwitchMenuItem(
            'Show first city on the bar',
            this._settings.get_string('bar-mode') === 'time');
        barModeSwitch.connect('toggled', item =>
            this._settings.set_string('bar-mode', item.state ? 'time' : 'icon'));
        display.menu.addMenuItem(barModeSwitch);

        const manage = new PopupMenu.PopupSubMenuMenuItem('Manage locations');
        menu.addMenuItem(manage);
        const current = new Set(locations.map(e => splitLocation(e).zoneId));
        for (const zoneId of ZONE_CATALOG) {
            const item = new PopupMenu.PopupSwitchMenuItem(prettyZone(zoneId), current.has(zoneId));
            item.connect('toggled', it => {
                const now = this._settings.get_strv('locations').slice();
                const ids = now.map(e => splitLocation(e).zoneId);
                if (it.state && !ids.includes(zoneId)) {
                    this._settings.set_strv('locations', now.concat(zoneId));
                } else if (!it.state && now.length > 1) {
                    // Never let the list drop to zero cities.
                    this._settings.set_strv('locations',
                        now.filter(e => splitLocation(e).zoneId !== zoneId));
                }
            });
            manage.menu.addMenuItem(item);
        }

        this._refresh();
    }

    _parseConvert() {
        if (!this._convertEntry || !this._rows[0])
            return null;
        return parseConvertText(this._convertEntry.text, this._rows[0].zone);
    }

    _applyBarStyles() {
        const iconSize = this._settings.get_int('icon-size');
        this._icon.style =
            `font-family: "CaskaydiaMono Nerd Font"; font-size: ${iconSize}px;`;
    }

    _refresh() {
        this._applyBarStyles();
        const use24 = this._settings.get_boolean('use-24h');
        const showOffsets = this._settings.get_boolean('show-offsets');
        const fmt = use24 ? '%H:%M' : '%I:%M %p';
        const localDate = GLib.DateTime.new_now_local();
        const convert = this._parseConvert();

        if (this._convertHeader) {
            this._convertHeader.label.text = convert
                ? `Meeting ${convert.text} in ${this._rows[0].name} →`
                : 'Convert a meeting time (first city)';
        }

        for (const r of this._rows) {
            const shown = convert ? convert.instant.to_timezone(r.zone) : GLib.DateTime.new_now(r.zone);
            r.timeLabel.text = shown.format(fmt);
            const diff = dayDiff(shown, localDate);
            r.dayLabel.text = diff === 1 ? 'Tomorrow'
                : diff === -1 ? 'Yesterday'
                    : diff === 0 ? ''
                        : diff > 1 ? `+${diff}d` : `${diff}d`;
            r.nameLabel.text = showOffsets
                ? `${r.name}  ${offsetText(shown)}` : r.name;
        }

        const mode = this._settings.get_string('bar-mode');
        const first = this._rows[0];
        // Always visible: an empty label keeps the box spacing alive, which
        // is what gives the hover halo its width in icon mode.
        this._barLabel.visible = true;
        if (first && mode === 'time')
            this._barLabel.text = `${first.name} ${GLib.DateTime.new_now(first.zone).format(fmt)}`;
        else
            this._barLabel.text = '';
    }
});

export default class WorldClockExtension extends Extension {
    enable() {
        this._indicator = new WorldClockIndicator(this);
        // Center box, right next to the GNOME clock (which sits at index 0).
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'center');
        // Shrink the clock button's padding so the globe sits tight against
        // it while both keep symmetric, full-size hover pills.
        Main.panel.statusArea.dateMenu?.set_style(
            '-natural-hpadding: 1px; -minimum-hpadding: 1px;');
    }

    disable() {
        if (!this._indicator)
            return;
        if (this._indicator._refreshId) {
            GLib.source_remove(this._indicator._refreshId);
            this._indicator._refreshId = 0;
        }
        if (this._indicator._settingsChangedId) {
            this._indicator._settings.disconnect(this._indicator._settingsChangedId);
            this._indicator._settingsChangedId = 0;
        }
        this._indicator.destroy();
        this._indicator = null;
    }
}
