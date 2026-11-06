# Omadebian (inspired by Omakub)

Turn a fresh Debian installation into a fully-configured, beautiful, and modern web development system by running a single command. That's the one-line pitch for Omadebian. No need to write bespoke configs for every essential tool just to get started or to be up on all the latest command-line tools. Omadebian is an opinionated take on what Linux can be at its best.

Watch the introduction video and read more at [omakub.org](https://omakub.org).

## Before install

Add your $USER to `sudo` group.
Make sure you install zsh before running.

## Install

```bash
eval "$(wget -qO- https://raw.githubusercontent.com/tomydng/omadebian/main/boot.sh)"
```

## License

No License

## Bundled plugins

### Agents

An Omarchy-inspired native GNOME Shell 48 panel showing remaining Claude Code and Codex subscription quota, with Claude prioritized on the top bar. Source, tests, and installer live in [`plugins/agents`](plugins/agents/README.md), managed directly by this repository.

The desktop installer installs Agents through `install/desktop/set-gnome-extensions.sh`. To install or update it separately:

```bash
bash plugins/agents/install.sh
```

The installed extension lives in `~/.local/share/gnome-shell/extensions/agents@tomydng.local/`. A new extension may require one logout/login. See the [plugin README](plugins/agents/README.md) for testing, packaging, preferences, and removal. The plugin and its third-party assets retain their own MIT license and notices.

## Extras

While omadebian is purposed to be an opinionated take, the open source community offers alternative customization, add-ons, extras, that you can use to adjust, replace or enrich your experience.
