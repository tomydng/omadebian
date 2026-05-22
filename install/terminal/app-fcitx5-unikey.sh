#!/bin/bash

sudo apt install -y fcitx5 fcitx5-unikey fcitx5-gtk fcitx5-qt \
  fcitx5-frontend-gtk2 fcitx5-frontend-gtk3 fcitx5-frontend-qt5 \
  fcitx5-config-qt

mkdir -p ~/.config/fcitx5
cp "$OMADEBIAN_PATH/configs/fcitx5/config" ~/.config/fcitx5/config
cp "$OMADEBIAN_PATH/configs/fcitx5/profile" ~/.config/fcitx5/profile

mkdir -p ~/.config/autostart
cp /usr/share/applications/org.fcitx.Fcitx5.desktop ~/.config/autostart/
