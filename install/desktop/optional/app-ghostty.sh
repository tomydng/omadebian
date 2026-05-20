#!/bin/bash

# Ghostty - a modern, GPU-accelerated terminal emulator. See https://ghostty.org/
# Installed via the unofficial Debian package repo: https://github.com/dariogriffo/ghostty-debian
if [ ! -f /etc/apt/sources.list.d/debian.griffo.io.list ]; then
  curl -fsSL https://debian.griffo.io/EA0F721D231FDD3A0A17B9AC7808B4DD62C41256.asc \
    | sudo gpg --dearmor -o /usr/share/keyrings/debian.griffo.io.gpg
  echo "deb [signed-by=/usr/share/keyrings/debian.griffo.io.gpg] https://debian.griffo.io/apt $(lsb_release -sc) main" \
    | sudo tee /etc/apt/sources.list.d/debian.griffo.io.list
fi

sudo apt update
sudo apt install -y ghostty

mkdir -p ~/.config/ghostty
cp ~/.local/share/omadebian/configs/ghostty/config ~/.config/ghostty/config
