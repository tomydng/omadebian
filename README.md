# Agents for GNOME

An Omarchy-inspired, native GNOME Shell 48 panel showing **remaining subscription quota** for Claude Code and Codex. Claude appears first and is the default top-bar subscription.

## Use

Click the robot / `Claude · 72%` in the top bar. Each subscription shows its plan, session and weekly allowances, remaining percentage, progress bars, and reset countdown. The top bar uses the lower of the general session and weekly allowances. Model-specific windows remain separate in the panel.

- **Refresh button / R / middle click:** refresh quota; checks have a 60-second minimum and respect server backoff.
- **+ / Sign in again:** launch the selected CLI's normal sign-in in your terminal.
- **Terminal button / footer:** launch Claude Code or Codex, with normal permissions.
- **Settings:** choose the top-bar subscription, hide the percentage, or change refresh frequency.

`—` means unavailable, not 100% remaining. `~` and “Last known quota” identify stale readings. A window whose reset has passed is unknown until the next successful provider response. No allowance is estimated from local tokens.

## Install

Requirements: GNOME Shell 48, Python 3.10+, `gnome-extensions`, and the CLI(s) signed in with a subscription account. No pip/npm dependencies or separate API key.

```sh
./install.sh
```

On Wayland, a newly installed extension may require **one logout/login**. The installer queues enablement without restarting your desktop. Afterward it appears as **Agents** in the Extensions app.

```sh
./install.sh --pack-only   # build the distributable zip
./uninstall.sh            # remove only this extension
```

## Data

Claude uses its existing OAuth sign-in in `${CLAUDE_CONFIG_DIR:-~/.claude}/.credentials.json` (or `CLAUDE_CODE_OAUTH_TOKEN`) and `https://api.anthropic.com/api/oauth/usage`, like Omarchy. An expired token needs Claude Code to renew it, or a normal `claude auth login`. The extension never rotates Claude credentials itself.

Codex uses `codex app-server`, the initialize handshake, `account/read`, and `account/rateLimits/read`. The CLI manages its own authentication. API-key-only accounts have no subscription quota to display. Quota collection does not create a thread or call a model.

The private cache is `${XDG_CACHE_HOME:-~/.cache}/gnome-agents/quota.json`; it contains quota values, timestamps and hashed account fingerprints, never tokens or email addresses. The helper only sends Claude's token to Anthropic; Codex handles its own provider connection. Provider failure does not erase a previous valid reading, and data from different sign-ins is never reused.

Refresh defaults to 5 minutes. API errors are sanitized. Requests/subprocesses have deadlines and are cleaned up when the extension is disabled. Unsupported accounts display their status rather than fake usage.

## Development

```sh
python3 -m unittest discover -s tests -v
gjs -m tests/test_quota.js
glib-compile-schemas --strict schemas
./install.sh --pack-only
/usr/bin/python3 collector.py   # sanitized live quota JSON
```

Inspired by [Omarchy Agents](https://github.com/omacom/omarchy/tree/quattro/shell/plugins/agents). Brand SVG assets are reused under the upstream MIT license; see `THIRD_PARTY_NOTICES.md`. This is an independent GNOME implementation, not an official Omarchy or provider extension.
