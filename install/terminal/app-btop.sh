#!/bin/bash

# This script installs btop, a resource monitor that shows usage and stats for processor, memory, disks, network and processes.
sudo apt install -y btop

# Use Omadebian btop config
mkdir -p ~/.config/btop
cp ~/.local/share/omadebian/configs/btop.conf ~/.config/btop/btop.conf

