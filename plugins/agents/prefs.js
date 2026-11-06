import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AgentsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage({title: 'Agents', icon_name: 'utilities-terminal-symbolic'});
        const group = new Adw.PreferencesGroup({title: 'Remaining quota', description: 'Claude Code and Codex · inspired by Omarchy'});
        const show = new Adw.SwitchRow({title: 'Show percentage on the top bar', subtitle: 'The lower of the session and weekly allowances'});
        settings.bind('show-percentage', show, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(show);
        const primary = new Adw.ComboRow({title: 'Top bar subscription', model: Gtk.StringList.new(['Claude Code', 'Codex'])});
        primary.selected = settings.get_string('primary-provider') === 'codex' ? 1 : 0;
        primary.connect('notify::selected', () => settings.set_string('primary-provider', primary.selected === 1 ? 'codex' : 'claude'));
        group.add(primary);
        const refresh = new Adw.SpinRow({title: 'Refresh interval', subtitle: 'Seconds · manual refresh respects a 60-second minimum',
            adjustment: new Gtk.Adjustment({lower: 60, upper: 3600, step_increment: 60, page_increment: 300})});
        settings.bind('refresh-interval', refresh, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(refresh);
        page.add(group);
        const about = new Adw.PreferencesGroup({title: 'Your existing sign-in', description: 'Quota comes directly from each provider. No model requests are made. Sign in again with Claude Code or Codex if a subscription needs authentication.'});
        page.add(about);
        window.add(page);
    }
}
