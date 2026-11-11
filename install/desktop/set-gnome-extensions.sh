#!/bin/bash

OMADEBIAN_PATH="${OMADEBIAN_PATH:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)}"

sudo apt install -y gnome-shell-extension-manager gir1.2-gtop-2.0 gir1.2-clutter-1.0 python3-gi libglib2.0-bin
pipx install gnome-extensions-cli --system-site-packages

# Install new extensions
gext install tactile@lundal.io
gext install just-perfection-desktop@just-perfection
gext install blur-my-shell@aunetx
gext install space-bar@luchrioh
gext install undecorate@sun.wxg@gmail.com
gext install tophat@fflewddur.github.io
gext install AlphabeticalAppGrid@stuarthayhurst
gext install clipboard-indicator@tudmotu.com
gext install appindicatorsupport@rgcjonas.gmail.com
gext install multi-monitors-bar@frederykabryan
gext install notification-banner@VitalyOstanin

# Compile gsettings schemas in order to be able to set them
sudo cp ~/.local/share/gnome-shell/extensions/tactile@lundal.io/schemas/org.gnome.shell.extensions.tactile.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/just-perfection-desktop\@just-perfection/schemas/org.gnome.shell.extensions.just-perfection.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/blur-my-shell\@aunetx/schemas/org.gnome.shell.extensions.blur-my-shell.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/space-bar\@luchrioh/schemas/org.gnome.shell.extensions.space-bar.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/tophat@fflewddur.github.io/schemas/org.gnome.shell.extensions.tophat.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/AlphabeticalAppGrid\@stuarthayhurst/schemas/org.gnome.shell.extensions.AlphabeticalAppGrid.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/clipboard-indicator\@tudmotu.com/schemas/org.gnome.shell.extensions.clipboard-indicator.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/appindicatorsupport\@rgcjonas.gmail.com/schemas/org.gnome.shell.extensions.appindicator.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/multi-monitors-bar\@frederykabryan/schemas/org.gnome.shell.extensions.multi-monitors-bar.gschema.xml /usr/share/glib-2.0/schemas/
sudo cp ~/.local/share/gnome-shell/extensions/notification-banner\@VitalyOstanin/schemas/org.gnome.shell.extensions.notification-banner.gschema.xml /usr/share/glib-2.0/schemas/
sudo glib-compile-schemas /usr/share/glib-2.0/schemas/

# Configure Tactile
gsettings set org.gnome.shell.extensions.tactile col-0 1
gsettings set org.gnome.shell.extensions.tactile col-1 2
gsettings set org.gnome.shell.extensions.tactile col-2 1
gsettings set org.gnome.shell.extensions.tactile col-3 0
gsettings set org.gnome.shell.extensions.tactile row-0 1
gsettings set org.gnome.shell.extensions.tactile row-1 1
gsettings set org.gnome.shell.extensions.tactile gap-size 10

# Configure Just Perfection
gsettings set org.gnome.shell.extensions.just-perfection panel-button-padding-size 5
gsettings set org.gnome.shell.extensions.just-perfection panel-indicator-padding-size 5
gsettings set org.gnome.shell.extensions.just-perfection animation 2
gsettings set org.gnome.shell.extensions.just-perfection dash-app-running true
gsettings set org.gnome.shell.extensions.just-perfection workspace true
gsettings set org.gnome.shell.extensions.just-perfection workspace-popup false

# Configure Blur My Shell
gsettings set org.gnome.shell.extensions.blur-my-shell.appfolder blur false
gsettings set org.gnome.shell.extensions.blur-my-shell.lockscreen blur false
gsettings set org.gnome.shell.extensions.blur-my-shell.screenshot blur false
gsettings set org.gnome.shell.extensions.blur-my-shell.window-list blur false
gsettings set org.gnome.shell.extensions.blur-my-shell.panel blur false
gsettings set org.gnome.shell.extensions.blur-my-shell.overview blur true
gsettings set org.gnome.shell.extensions.blur-my-shell.overview pipeline 'pipeline_default'
gsettings set org.gnome.shell.extensions.blur-my-shell.dash-to-dock blur true
gsettings set org.gnome.shell.extensions.blur-my-shell.dash-to-dock brightness 0.6
gsettings set org.gnome.shell.extensions.blur-my-shell.dash-to-dock sigma 30
gsettings set org.gnome.shell.extensions.blur-my-shell.dash-to-dock static-blur true
gsettings set org.gnome.shell.extensions.blur-my-shell.dash-to-dock style-dash-to-dock 0

# Configure Space Bar
gsettings set org.gnome.shell.extensions.space-bar.behavior smart-workspace-names false
gsettings set org.gnome.shell.extensions.space-bar.shortcuts enable-activate-workspace-shortcuts false
gsettings set org.gnome.shell.extensions.space-bar.shortcuts enable-move-to-workspace-shortcuts true
gsettings set org.gnome.shell.extensions.space-bar.shortcuts open-menu "@as []"

# Configure TopHat
gsettings set org.gnome.shell.extensions.tophat show-icons true
gsettings set org.gnome.shell.extensions.tophat show-cpu true
gsettings set org.gnome.shell.extensions.tophat show-disk false
gsettings set org.gnome.shell.extensions.tophat show-mem true
gsettings set org.gnome.shell.extensions.tophat show-fs false
gsettings set org.gnome.shell.extensions.tophat network-usage-unit bits
gsettings set org.gnome.shell.extensions.tophat mem-abs-units true
gsettings set org.gnome.shell.extensions.tophat mem-display numeric
gsettings set org.gnome.shell.extensions.tophat cpu-display numeric

# Configure Notification Banner (banner: top-center with a small margin)
gsettings set org.gnome.shell.extensions.notification-banner horizontal-position 'center'
gsettings set org.gnome.shell.extensions.notification-banner vertical-position 'top'
gsettings set org.gnome.shell.extensions.notification-banner padding-horizontal 8
gsettings set org.gnome.shell.extensions.notification-banner padding-vertical 8

# Configure Multi Monitor Bar (top bar on every monitor). NOTE: incompatible
# with Top Bar Organizer Plus (both arrange the same indicators -> stacking).
gsettings set org.gnome.shell.extensions.multi-monitors-bar show-app-indicators true

# Configure AlphabeticalAppGrid
gsettings set org.gnome.shell.extensions.alphabetical-app-grid folder-order-position 'end'

# Configure Clipboard Indicator
gsettings set org.gnome.shell.extensions.clipboard-indicator history-size 15
gsettings set org.gnome.shell.keybindings toggle-message-tray "@as []"
gsettings set org.gnome.shell.extensions.clipboard-indicator toggle-menu "['<Super>v']"

# Patch kimpanel's top-bar indicator into an EVKey-style badge
# (fixed-size V/E tile; must be re-applied if the extension is updated).
bash "$OMADEBIAN_PATH/scripts/patch-kimpanel.sh"

# Install bundled GNOME plugins.
bash "$OMADEBIAN_PATH/plugins/agents/install.sh"
bash "$OMADEBIAN_PATH/plugins/planify/install.sh"
bash "$OMADEBIAN_PATH/plugins/wireguard/install.sh"
