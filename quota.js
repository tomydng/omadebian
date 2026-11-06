/* Pure formatting shared by the Shell UI and its GJS tests. */
export function remainingValue(window, now = Date.now() / 1000) {
    const value = window?.remaining;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
        return null;
    if (typeof window.resetsAt === 'number' && window.resetsAt <= now)
        return null;
    return value;
}

export function percentText(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? `${Math.floor(Math.max(0, Math.min(100, value)))}%` : '—';
}

export function primaryQuota(provider, now = Date.now() / 1000) {
    const all = Array.isArray(provider?.windows) ? provider.windows : [];
    const general = all.filter(window => ['Session', 'Weekly'].includes(window.label));
    const windows = (general.length ? general : all)
        .map(window => ({...window, remaining: remainingValue(window, now)}))
        .filter(window => window.remaining !== null);
    return windows.sort((a, b) => a.remaining - b.remaining)[0] ?? null;
}

export function panelLabel(provider, show = true, now = Date.now() / 1000) {
    if (!show)
        return '';
    const name = provider?.id === 'codex' ? 'Codex' : 'Claude';
    const quota = primaryQuota(provider, now);
    const stale = quota && (provider?.stale || !['ok', undefined].includes(provider?.status));
    return `${name} · ${stale ? '~' : ''}${percentText(quota?.remaining)}`;
}

export function resetLabel(timestamp, now = Date.now() / 1000) {
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp))
        return 'Reset time unavailable';
    const seconds = timestamp - now;
    if (seconds <= 0)
        return 'Awaiting update';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1)
        return 'Resets in <1m';
    if (minutes >= 1440)
        return `Resets in ${Math.floor(minutes / 1440)}d ${Math.floor(minutes % 1440 / 60)}h`;
    if (minutes >= 60)
        return `Resets in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `Resets in ${minutes}m`;
}

export function ageLabel(timestamp, now = Date.now() / 1000) {
    if (typeof timestamp !== 'number')
        return 'Not yet updated';
    const minutes = Math.max(0, Math.floor((now - timestamp) / 60));
    if (!minutes)
        return 'Updated just now';
    return minutes < 60 ? `Updated ${minutes}m ago` : `Updated ${Math.floor(minutes / 60)}h ago`;
}
