#!/bin/bash

OMADEBIAN_THEME_COLOR="red"
OMADEBIAN_THEME_BACKGROUND="rose-pine/background.jpg"
source $OMADEBIAN_PATH/themes/set-gnome-theme.sh
gsettings set org.gnome.desktop.interface color-scheme 'prefer-light'
