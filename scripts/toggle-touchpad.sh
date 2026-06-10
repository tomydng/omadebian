#!/bin/bash

STATE=$(gsettings get org.gnome.desktop.peripherals.touchpad send-events)
if [ "$STATE" = "'enabled'" ]; then
    gsettings set org.gnome.desktop.peripherals.touchpad send-events disabled
    notify-send "Touchpad OFF"
else
    gsettings set org.gnome.desktop.peripherals.touchpad send-events enabled
    notify-send "Touchpad ON"
fi
