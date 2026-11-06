# Agents for GNOME

Build and install a native GNOME 48 extension closely matching Omarchy's Agents panel. User uses Claude more than Codex and wants **remaining quota percentages**, not token statistics. User explicitly requested direct implementation without more design questions.

## Design

- Top bar: robot icon, Claude's remaining session percentage. If a weekly allowance is more restrictive, show that remaining percentage and identify the window in the popup. Unknown is `—`, never a fabricated 100%.
- Popup: Agents hero, compact subtitle, refresh and launch buttons; Claude first, Codex second. Brand marks, plan badges, remaining percentages, progress meters, and reset countdowns. Footer with quick launch buttons. Native GNOME theme colors and an Omarchy-inspired compact layout.
- Claude: existing CLI OAuth sign-in and Anthropic's usage endpoint, matching Omarchy. Codex: existing CLI app-server JSON-RPC `account/rateLimits/read`. No model calls, new API keys, account switching, or automatic login.
- A Python standard-library helper fetches both providers concurrently, caches display-safe results atomically with private permissions, and preserves stale data on errors. Credentials never leave their provider or appear in output/cache. Requests and subprocesses have hard timeouts. Rate-limit checks back off.
- GJS asynchronously runs the helper; only one collector runs at once. Refresh every 5 minutes (with a 60-second minimum for manual refresh), stop timers/child process on disable. No continuous animation.
- Authentication/network failures are visible, with actionable status and a login button. A missing allowance is unknown. Expired windows kept after a failed check are unknown, never assumed refilled.

## Approaches

Native GJS extension (selected by implementer following user's “làm đi” instruction) provides the closest GNOME top-bar and panel integration. An AppIndicator app has a more constrained menu; porting the QML/Quickshell panel directly would not integrate as a GNOME Shell menu.

## Scope

Include local source, meaningful collector/protocol tests, GNOME runtime verification, install/uninstall scripts, and a distributable extension zip. Enable it if the running session supports registering a newly installed extension. Never restart or log out the desktop automatically. If GNOME requires a new login, queue enablement and report that remaining step.

Preserve attribution for reused Omarchy SVG assets under its MIT license. Multi-account administration, token charts and unrelated Omarchy creation prompts are outside this quota-focused version.
