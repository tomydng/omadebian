#!/bin/bash

# Display system information in the terminal
sudo apt install -y fastfetch

# Only attempt to set configuration if fastfetch is not already set
if [ ! -f "$HOME/.config/fastfetch/config.jsonc" ]; then
  # Use Omadebian fastfetch config
  mkdir -p ~/.config/fastfetch
  cp ~/.local/share/omadebian/configs/fastfetch.jsonc ~/.config/fastfetch/config.jsonc
fi
