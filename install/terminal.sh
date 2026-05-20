#!/bin/bash

# Needed for all installers
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y curl git unzip lsb-release

# Run terminal installers
for installer in ~/.local/share/omadebian/install/terminal/*.sh; do source $installer; done
