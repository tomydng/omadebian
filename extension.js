import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';
import {ageLabel, markStale, panelLabel, percentText, primaryQuota, remainingValue, resetLabel} from './quota.js';

const COLORS = {claude: [0.85, 0.56, 0.43], codex: [0.54, 0.77, 0.76], warning: [0.91, 0.71, 0.42], danger: [0.91, 0.47, 0.49]};

function label(text, styleClass, expand = false) {
    return new St.Label({text, style_class: styleClass, x_expand: expand, y_align: Clutter.ActorAlign.CENTER});
}

function box(styleClass, vertical = false) {
    return new St.BoxLayout({vertical, style_class: styleClass, x_expand: true});
}

function roundedRect(cr, x, y, width, height) {
    const radius = Math.min(height / 2, width / 2);
    cr.newSubPath();
    cr.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
    cr.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
    cr.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
    cr.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
    cr.closePath();
    cr.fill();
}

export default class AgentsExtension extends Extension {
    enable() {
        this._active = true;
        this._settings = this.getSettings();
        this._interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._rows = [];
        this._data = {providers: []};
        this._lastStarted = 0;
        this._readerError = '';
        this._proc = null;
        this._indicator = new PanelMenu.Button(0.0, 'Agents — remaining quota');
        const bar = box('agents-bar');
        bar.add_child(new St.Icon({gicon: this._icon('agents-symbolic.svg'), style_class: 'system-status-icon'}));
        this._barLabel = label('Claude · —', 'agents-bar-label');
        bar.add_child(this._barLabel);
        this._indicator.add_child(bar);
        this._indicator.menu.actor.add_style_class_name('agents-menu');
        this._buildPanel();
        this._themeChanged();
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
        this._settingsId = this._settings.connect('changed', () => {
            this._scheduleRefresh();
            this._updateLabels();
        });
        this._themeId = this._interfaceSettings.connect('changed::color-scheme', () => this._themeChanged());
        this._indicator.menu.connect('open-state-changed', (_menu, open) => {
            if (open) {
                this._updateLabels();
                this._refresh(false);
            }
        });
        this._indicator.connect('button-press-event', (_actor, event) => {
            if (event.get_button() === 2) {
                this._refresh(true);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this._indicator.menu.actor.connect('key-press-event', (_actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_r || event.get_key_symbol() === Clutter.KEY_R) {
                this._refresh(true);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this._clockTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            this._updateLabels();
            return GLib.SOURCE_CONTINUE;
        });
        this._scheduleRefresh();
        this._refresh(false);
    }

    _icon(filename) {
        return Gio.icon_new_for_string(`${this.path}/icons/${filename}`);
    }

    _button(iconName, accessibleName, callback) {
        const button = new St.Button({style_class: 'agents-icon-button', can_focus: true, accessible_name: accessibleName});
        button.set_child(new St.Icon({icon_name: iconName, icon_size: 16}));
        button.connect('clicked', callback);
        return button;
    }

    _textButton(text, callback, styleClass = 'agents-action') {
        const button = new St.Button({style_class: styleClass, can_focus: true, label: text});
        button.connect('clicked', callback);
        return button;
    }

    _buildPanel() {
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false, style_class: 'agents-container'});
        this._root = box('agents-content', true);
        item.add_child(this._root);
        this._indicator.menu.addMenuItem(item);

        const hero = box('agents-hero');
        hero.add_child(new St.Icon({gicon: this._icon('agents-symbolic.svg'), style_class: 'agents-hero-icon', icon_size: 34}));
        const titles = box('agents-titles', true);
        titles.add_child(label('Agents', 'agents-title'));
        titles.add_child(label('QUOTA REMAINING', 'agents-eyebrow'));
        hero.add_child(titles);
        const controls = box('agents-controls');
        controls.x_expand = false;
        controls.y_align = Clutter.ActorAlign.CENTER;
        this._refreshButton = this._button('view-refresh-symbolic', 'Refresh quota (R)', () => this._refresh(true));
        controls.add_child(this._refreshButton);
        controls.add_child(this._button('list-add-symbolic', 'Sign in to an account', () => {
            this._accounts.visible = !this._accounts.visible;
        }));
        controls.add_child(this._button('utilities-terminal-symbolic', 'Launch Claude Code', () => this._launch('claude')));
        hero.add_child(controls);
        this._root.add_child(hero);

        this._accounts = box('agents-accounts', true);
        this._accounts.visible = false;
        this._accounts.add_child(label('ADD A SUBSCRIPTION', 'agents-eyebrow'));
        const signins = box('agents-actions');
        signins.add_child(this._textButton('Sign in · Claude', () => this._launch('claude', true)));
        signins.add_child(this._textButton('Sign in · Codex', () => this._launch('codex', true)));
        this._accounts.add_child(signins);
        this._root.add_child(this._accounts);

        this._providers = box('agents-providers', true);
        this._root.add_child(this._providers);
        this._root.add_child(new St.Widget({style_class: 'agents-separator', x_expand: true}));
        const footer = box('agents-footer', true);
        footer.add_child(label('READY WHEN YOU ARE', 'agents-eyebrow'));
        const actions = box('agents-actions');
        for (const [id, text] of [['claude', 'Claude Code'], ['codex', 'Codex']])
            actions.add_child(this._textButton(text, () => this._launch(id)));
        actions.add_child(this._button('preferences-system-symbolic', 'Agents preferences', () => {
            this._indicator.menu.close();
            this.openPreferences();
        }));
        footer.add_child(actions);
        this._root.add_child(footer);
        this._updated = label('Checking your subscriptions…', 'agents-updated');
        this._updated.x_align = Clutter.ActorAlign.CENTER;
        this._root.add_child(this._updated);
        this._render();
    }

    _themeChanged() {
        this._light = this._interfaceSettings.get_string('color-scheme') === 'prefer-light';
        if (this._light)
            this._indicator.menu.actor.add_style_class_name('agents-light');
        else
            this._indicator.menu.actor.remove_style_class_name('agents-light');
        if (this._providers)
            this._render();
    }

    _render() {
        this._rows = [];
        this._providers.destroy_all_children();
        for (const id of ['claude', 'codex']) {
            const provider = this._data.providers.find(value => value.id === id) ?? {
                id, name: id === 'claude' ? 'Claude Code' : 'Codex', status: 'loading', windows: [],
                message: 'Checking your subscription…',
            };
            const section = box(`agents-provider agents-${id}`, true);
            const heading = box('agents-provider-heading');
            heading.add_child(new St.Icon({gicon: this._icon(id === 'codex' && this._light ? 'codex-light.svg' : `${id}.svg`), icon_size: 25}));
            heading.add_child(label(provider.name, 'agents-provider-name', true));
            if (provider.plan)
                heading.add_child(label(provider.plan, 'agents-plan'));
            section.add_child(heading);

            if (provider.windows.length) {
                for (const window of provider.windows) {
                    const quota = box('agents-quota', true);
                    const line = box('agents-quota-heading');
                    line.add_child(label(window.label, 'agents-window-label', true));
                    const percent = label('—', 'agents-percent');
                    line.add_child(percent);
                    quota.add_child(line);
                    const meter = new St.DrawingArea({style_class: 'agents-meter', x_expand: true, height: 6});
                    const row = {provider, window, percent, meter, reset: label('', 'agents-reset')};
                    meter.connect('repaint', () => this._drawMeter(row));
                    quota.add_child(meter);
                    quota.add_child(row.reset);
                    section.add_child(quota);
                    this._rows.push(row);
                }
            }
            if (provider.status !== 'ok' && provider.status !== 'loading') {
                const status = label(provider.stale ? `Last known quota · ${ageLabel(provider.fetchedAt)}\n${provider.message}` : provider.message, 'agents-status');
                status.clutter_text.line_wrap = true;
                status.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
                section.add_child(status);
            } else if (provider.status === 'loading') {
                section.add_child(label(provider.message, 'agents-status'));
            }
            if (['auth', 'missing'].includes(provider.status)) {
                const signin = this._textButton('Sign in again  ↗', () => this._launch(id, true), 'agents-signin');
                signin.x_align = Clutter.ActorAlign.START;
                section.add_child(signin);
            }
            this._providers.add_child(section);
        }
        this._updateLabels();
    }

    _drawMeter(row) {
        const [width, height] = row.meter.get_surface_size();
        if (width <= 0 || height <= 0)
            return;
        const cr = row.meter.get_context();
        cr.setSourceRGBA(this._light ? 0 : 1, this._light ? 0 : 1, this._light ? 0 : 1, 0.1);
        roundedRect(cr, 0, 0, width, height);
        const value = remainingValue(row.window);
        if (value !== null && value > 0) {
            const color = value <= 10 ? COLORS.danger : value <= 25 ? COLORS.warning : COLORS[row.provider.id];
            cr.setSourceRGBA(...color, row.provider.stale ? 0.55 : 1);
            roundedRect(cr, 0, 0, Math.max(2, width * value / 100), height);
        }
        cr.$dispose();
    }

    _updateLabels() {
        if (!this._active)
            return;
        const id = this._settings.get_string('primary-provider');
        const provider = this._data.providers.find(value => value.id === id) ?? {id};
        const text = panelLabel(provider, this._settings.get_boolean('show-percentage'));
        this._barLabel.text = text;
        this._barLabel.visible = Boolean(text);
        const primary = primaryQuota(provider);
        this._indicator.accessible_name = `${provider.name ?? 'Claude Code'}: ${primary ? `${percentText(primary.remaining)} remaining, ${primary.label}` : 'quota unavailable'}`;
        for (const row of this._rows) {
            const value = remainingValue(row.window);
            row.percent.text = `${value !== null && row.provider.stale ? '~' : ''}${percentText(value)}${value !== null ? ' left' : ''}`;
            row.percent.style_class = `agents-percent${value !== null && value <= 10 ? ' agents-danger' : ''}`;
            row.reset.text = resetLabel(row.window.resetsAt);
            row.meter.queue_repaint();
        }
        if (!this._proc && this._data.updatedAt)
            this._updated.text = this._readerError || `${ageLabel(this._data.updatedAt)} · auto refresh`;
        else if (!this._proc && this._readerError)
            this._updated.text = this._readerError;
    }

    _scheduleRefresh() {
        if (this._refreshTimer)
            GLib.source_remove(this._refreshTimer);
        this._refreshTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT,
            this._settings.get_int('refresh-interval'), () => {
                this._refresh(true);
                return GLib.SOURCE_CONTINUE;
            });
    }

    _refresh(force) {
        if (!this._active || this._proc || (!force && Date.now() - this._lastStarted < 60000))
            return;
        this._lastStarted = Date.now();
        const argv = ['/usr/bin/python3', `${this.path}/collector.py`];
        if (force)
            argv.push('--force');
        this._updated.text = 'Refreshing quota…';
        this._refreshButton.reactive = false;
        let process;
        try {
            process = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
        } catch (_error) {
            this._refreshButton.reactive = true;
            this._failReader('Could not start quota reader · try again');
            return;
        }
        this._proc = process;
        const timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 40, () => {
            this._processTimeout = 0;
            process.send_signal(15);
            return GLib.SOURCE_REMOVE;
        });
        this._processTimeout = timeout;
        process.communicate_utf8_async(null, null, (_process, result) => {
            // A disabled/re-enabled extension can have a different reader now.
            if (!this._active || this._proc !== process)
                return;
            if (this._processTimeout) {
                GLib.source_remove(this._processTimeout);
                this._processTimeout = 0;
            }
            this._proc = null;
            this._refreshButton.reactive = true;
            try {
                const [, output] = process.communicate_utf8_finish(result);
                if (!process.get_successful() || output.length > 1048576)
                    throw new Error('Reader did not succeed');
                const data = JSON.parse(output);
                if (!Array.isArray(data.providers) || !data.providers.every(provider =>
                    ['claude', 'codex'].includes(provider.id) && Array.isArray(provider.windows)))
                    throw new Error('Invalid quota data');
                this._readerError = '';
                this._data = data;
                this._render();
            } catch (_error) {
                this._failReader('Could not refresh · try again');
            }
        });
    }

    _failReader(message) {
        this._readerError = message;
        this._data = markStale(this._data, message);
        this._render();
    }

    _launch(provider, signin = false) {
        const home = GLib.get_home_dir();
        const candidates = [GLib.find_program_in_path(provider), `${home}/.local/bin/${provider}`,
            `${home}/.npm-global/bin/${provider}`, `${home}/.local/share/mise/shims/${provider}`];
        const command = candidates.find(path => path && GLib.file_test(path, GLib.FileTest.IS_EXECUTABLE));
        if (!command) {
            Main.notify('Agents', `${provider} is not installed.`);
            return;
        }
        const args = signin ? provider === 'claude' ? ['auth', 'login'] : ['login'] : [];
        const terminal = ['gnome-terminal', 'kgx', 'alacritty', 'kitty', 'x-terminal-emulator']
            .find(name => GLib.find_program_in_path(name));
        if (!terminal) {
            Main.notify('Agents', 'Install a terminal to launch your coding agent.');
            return;
        }
        this._indicator.menu.close();
        const separator = ['alacritty', 'kitty', 'x-terminal-emulator'].includes(terminal) ? '-e' : '--';
        Util.spawn([terminal, separator, command, ...args]);
    }

    disable() {
        this._active = false;
        for (const key of ['_refreshTimer', '_clockTimer', '_processTimeout']) {
            if (this[key]) {
                GLib.source_remove(this[key]);
                this[key] = 0;
            }
        }
        if (this._proc) {
            this._proc.send_signal(15);
            this._proc = null;
        }
        this._settings?.disconnect(this._settingsId);
        this._interfaceSettings?.disconnect(this._themeId);
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
        this._interfaceSettings = null;
        this._rows = [];
        this._data = null;
    }
}
