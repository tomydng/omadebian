#!/bin/bash

sudo apt install -y fcitx5 fcitx5-unikey fcitx5-gtk fcitx5-qt

mkdir -p ~/.config/fcitx5
cp "$OMADEBIAN_PATH/configs/fcitx5/config" ~/.config/fcitx5/config
cp "$OMADEBIAN_PATH/configs/fcitx5/profile" ~/.config/fcitx5/profile

# Let GNOME handle Ctrl+Space globally and signal fcitx5 via Wayland IM protocol
gsettings set org.gnome.desktop.wm.keybindings switch-input-source "['<Control>space']"
gsettings set org.gnome.desktop.wm.keybindings switch-input-source-backward "@as []"
