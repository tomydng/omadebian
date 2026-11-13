#!/usr/bin/env gjs -m
// Logic tests for plugins/worldclock — run from the repo root:
//   gjs -m scripts/test-worldclock.mjs
//
// GNOME Shell UI (St/PopupMenu) cannot be instantiated outside a live shell,
// so this harness covers what CAN be verified headless: it extracts the
// top-level pure functions straight out of extension.js (no copy-paste drift)
// and exercises them against the real GLib timezone database — the same GLib
// calls the extension makes at runtime. The remaining shell-API surface is
// audited against the installed gnome-shell source instead.

import GLib from 'gi://GLib';
import System from 'system';

const scriptPath = GLib.filename_from_uri(import.meta.url)[0];
const repoRoot = GLib.path_get_dirname(GLib.path_get_dirname(scriptPath));
const src = imports.byteArray.toString(
    GLib.file_get_contents(`${repoRoot}/plugins/worldclock/extension.js`)[1]);

const start = src.indexOf('const ZONE_CATALOG');
const end = src.indexOf('const WorldClockIndicator');
if (start === -1 || end === -1)
    throw new Error('could not locate top-level code block in extension.js');
const code = src.slice(start, end);

const lib = new Function('GLib', `${code}
    return {ZONE_CATALOG, splitLocation, prettyZone, offsetText, dayDiff, parseConvertText};`)(GLib);

let failures = 0;
function check(name, cond, extra = '') {
    if (cond) {
        print(`  ok  ${name}`);
    } else {
        failures++;
        print(`FAIL  ${name} ${extra}`);
    }
}

const HCM = GLib.TimeZone.new('Asia/Ho_Chi_Minh');
const TOKYO = GLib.TimeZone.new('Asia/Tokyo');
const LONDON = GLib.TimeZone.new('Europe/London');
const NY = GLib.TimeZone.new('America/New_York');
const KOLKATA = GLib.TimeZone.new('Asia/Kolkata');

print('splitLocation / prettyZone');
check("'Asia/Tokyo' → Tokyo",
    lib.splitLocation('Asia/Tokyo').name === 'Tokyo');
check("'Asia/Ho_Chi_Minh' → Ho Chi Minh City",
    lib.splitLocation('Asia/Ho_Chi_Minh').name === 'Ho Chi Minh City');
check("custom label wins", lib.splitLocation('Asia/Tokyo|Tokyo HQ').name === 'Tokyo HQ');
check("custom label keeps zone", lib.splitLocation('Asia/Tokyo|Tokyo HQ').zoneId === 'Asia/Tokyo');
check('UTC stays UTC', lib.prettyZone('UTC') === 'UTC');

print('offsetText (real tzdata, November = no northern DST in these zones)');
// Fixed instant: 2026-11-13 12:00 UTC.
const utcInstant = GLib.DateTime.new(GLib.TimeZone.new('UTC'), 2026, 11, 13, 12, 0, 0);
check('HCM +07:00', lib.offsetText(utcInstant.to_timezone(HCM)) === '+07:00',
    `got ${lib.offsetText(utcInstant.to_timezone(HCM))}`);
check('Tokyo +09:00', lib.offsetText(utcInstant.to_timezone(TOKYO)) === '+09:00',
    `got ${lib.offsetText(utcInstant.to_timezone(TOKYO))}`);
check('London +00:00 (GMT in November)', lib.offsetText(utcInstant.to_timezone(LONDON)) === '+00:00',
    `got ${lib.offsetText(utcInstant.to_timezone(LONDON))}`);
check('New York -05:00 (EST after Nov 1)', lib.offsetText(utcInstant.to_timezone(NY)) === '-05:00',
    `got ${lib.offsetText(utcInstant.to_timezone(NY))}`);
check('Kolkata half-hour +05:30', lib.offsetText(utcInstant.to_timezone(KOLKATA)) === '+05:30',
    `got ${lib.offsetText(utcInstant.to_timezone(KOLKATA))}`);

print('dayDiff');
const tokyoLateNight = GLib.DateTime.new(TOKYO, 2026, 11, 14, 2, 0, 0);
const hcmSameDay = GLib.DateTime.new(HCM, 2026, 11, 13, 23, 0, 0);
check('Tokyo ahead by a day → +1', lib.dayDiff(tokyoLateNight, hcmSameDay) === 1,
    `got ${lib.dayDiff(tokyoLateNight, hcmSameDay)}`);
const hcmSameDay2 = GLib.DateTime.new(HCM, 2026, 11, 14, 8, 0, 0);
const tokyoSameDay = GLib.DateTime.new(TOKYO, 2026, 11, 14, 10, 0, 0);
check('same calendar date → 0', lib.dayDiff(tokyoSameDay, hcmSameDay2) === 0);
const nyEarly = GLib.DateTime.new(NY, 2026, 11, 13, 20, 0, 0);
check('NY behind by a day → -1', lib.dayDiff(nyEarly, hcmSameDay2) === -1,
    `got ${lib.dayDiff(nyEarly, hcmSameDay2)}`);

print('parseConvertText');
const r1 = lib.parseConvertText('15:30', HCM);
check("'15:30' parses", r1 !== null && r1.text === '15:30');
// Same wall-clock regardless of the today/tomorrow rollover: HCM+7 → Tokyo+9.
check('15:30 HCM → 17:30 Tokyo',
    r1.instant.to_timezone(TOKYO).format('%H:%M') === '17:30',
    `got ${r1.instant.to_timezone(TOKYO).format('%H:%M')}`);
check('15:30 HCM → 03:30 New York (12h behind, no DST in November)',
    r1.instant.to_timezone(NY).format('%H:%M') === '03:30',
    `got ${r1.instant.to_timezone(NY).format('%H:%M')}`);
check("instant is in the future (rollover to tomorrow if passed)",
    r1.instant.difference(GLib.DateTime.new_now(HCM)) > 0);

check("'3:30 pm' → 15:30", lib.parseConvertText('3:30 pm', HCM)?.text === '15:30');
check("converted pm time crosses zones correctly",
    lib.parseConvertText('3:30 pm', HCM).instant.to_timezone(TOKYO).format('%H:%M') === '17:30');
check("'12:00 am' → 00:00", lib.parseConvertText('12:00 am', HCM)?.text === '00:00');
check("'12:30 pm' → 12:30", lib.parseConvertText('12:30 pm', HCM)?.text === '12:30');
check("'9' → 09:00", lib.parseConvertText('9', HCM)?.text === '09:00');
check("'25:00' rejected", lib.parseConvertText('25:00', HCM) === null);
check("'12:60' rejected", lib.parseConvertText('12:60', HCM) === null);
check("'abc' rejected", lib.parseConvertText('abc', HCM) === null);
check("'' rejected", lib.parseConvertText('', HCM) === null);

print('runtime GLib API smoke (exact call shapes used by the extension)');
const nowLocal = GLib.DateTime.new_now_local();
check('get_ymd destructure', nowLocal.get_ymd().length === 3);
check('format %I:%M %p works', /^\d{1,2}:\d{2} (AM|PM|SA|CH)/.test(nowLocal.format('%I:%M %p')) ||
    /\d{1,2}:\d{2}/.test(nowLocal.format('%I:%M %p')));
check('TIME_SPAN constants', GLib.TIME_SPAN_MINUTE === 60000000 && GLib.TIME_SPAN_DAY === 86400000000);
check('add_days / difference agree', GLib.DateTime.new(HCM, 2026, 11, 13, 0, 0, 0)
    .add_days(1).difference(GLib.DateTime.new(HCM, 2026, 11, 13, 0, 0, 0)) === GLib.TIME_SPAN_DAY);
check('ZONE_CATALOG non-empty, all parse as zones',
    lib.ZONE_CATALOG.length >= 15 &&
    lib.ZONE_CATALOG.every(z => GLib.TimeZone.new(z) !== null));

print('');
if (failures > 0) {
    print(`${failures} FAILURE(S)`);
    System.exit(1);
}
print('all green');
