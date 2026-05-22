#!/bin/bash

sudo apt install -y fcitx5 fcitx5-unikey fcitx5-gtk fcitx5-qt \
  fcitx5-frontend-gtk2 fcitx5-frontend-gtk3 fcitx5-frontend-qt5 \
  fcitx5-config-qt

mkdir -p ~/.config/fcitx5
cp "$OMADEBIAN_PATH/configs/fcitx5/config" ~/.config/fcitx5/config
cp "$OMADEBIAN_PATH/configs/fcitx5/profile" ~/.config/fcitx5/profile

# Set env vars via systemd user environment (works on GNOME Wayland)
# im-config -n fcitx5 does not work on GNOME (overridden by DESKTOP_SETUP_IBUS)
mkdir -p ~/.config/environment.d
cat > ~/.config/environment.d/fcitx5.conf << 'EOF'
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
EOF

# Let GNOME handle Ctrl+Space globally and signal fcitx5 via Wayland IM protocol
gsettings set org.gnome.desktop.wm.keybindings switch-input-source "['<Control>space']"
gsettings set org.gnome.desktop.wm.keybindings switch-input-source-backward "@as []"
