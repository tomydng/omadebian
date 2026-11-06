import {remainingValue, percentText, primaryQuota, resetLabel, panelLabel} from '../quota.js';

let count = 0;
function equal(actual, expected, name) {
    if (actual !== expected)
        throw new Error(`${name}: expected ${expected}, got ${actual}`);
    count++;
}

equal(remainingValue({remaining: 0}, 100), 0, 'zero quota is valid');
equal(remainingValue({remaining: 95, resetsAt: 99}, 100), null, 'expired window is unknown');
for (const value of [null, undefined, true, NaN, Infinity, -1, 101, '50'])
    equal(remainingValue({remaining: value}, 100), null, 'invalid allowance');
equal(percentText(71.9), '71%', 'conservative rounding');
equal(percentText(null), '—', 'unknown allowance');
equal(percentText(0), '0%', 'exhausted allowance');
const claude = {id: 'claude', status: 'ok', windows: [
    {label: 'Session', remaining: 60, resetsAt: 5000},
    {label: 'Weekly', remaining: 20, resetsAt: 9000},
]};
equal(primaryQuota(claude, 100).remaining, 20, 'show restrictive window');
equal(primaryQuota({...claude, windows: [...claude.windows, {label: 'Opus · Weekly', remaining: 1}]}, 100).remaining, 20, 'model quota does not replace overall quota');
equal(panelLabel(claude, true, 100), 'Claude · 20%', 'Claude bar label');
equal(panelLabel({...claude, stale: true}, true, 100), 'Claude · ~20%', 'last known is marked');
equal(panelLabel({...claude, windows: []}, true, 100), 'Claude · —', 'auth placeholder');
equal(panelLabel(claude, false, 100), '', 'icon-only preference');
equal(resetLabel(100, 200), 'Awaiting update', 'reset does not imply full allowance');
equal(resetLabel(null, 200), 'Reset time unavailable', 'missing reset');
equal(resetLabel(200+3660, 200), 'Resets in 1h 1m', 'hours and minutes');
equal(resetLabel(200+86400*3+7200, 200), 'Resets in 3d 2h', 'days');
equal(resetLabel(230, 200), 'Resets in <1m', 'sub-minute');
print(`${count} quota UI assertions passed`);
