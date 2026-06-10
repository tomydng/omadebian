#!/bin/bash
# Requires: libnotify-bin (sudo apt install -y libnotify-bin)

notify() {
    command -v notify-send &>/dev/null || return 0
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u)/bus" notify-send "$1" || true
}

STATE=$(gsettings get org.gnome.desktop.peripherals.touchpad send-events)
if [ "$STATE" = "'enabled'" ]; then
    gsettings set org.gnome.desktop.peripherals.touchpad send-events disabled
    notify "Touchpad OFF"
else
    gsettings set org.gnome.desktop.peripherals.touchpad send-events enabled
    notify "Touchpad ON"
fi
