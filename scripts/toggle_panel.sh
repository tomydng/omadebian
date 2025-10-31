#!/bin/bash

# Read the current state of the panel (true is visible, false is hidden)
current_state=$(gsettings get org.gnome.shell.extensions.just-perfection panel)

# If currently visible (true), change to hidden (false) and vice versa
if [ "$current_state" = "true" ]; then
  gsettings set org.gnome.shell.extensions.just-perfection panel false
else
  gsettings set org.gnome.shell.extensions.just-perfection panel true
fi
