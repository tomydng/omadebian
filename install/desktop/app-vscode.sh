#!/bin/bash

if [ ! -f /etc/apt/keyrings/packages.microsoft.gpg ] || [ ! -f /usr/share/keyrings/microsoft.gpg ]; then
  [ -f /etc/apt/keyrings/packages.microsoft.gpg ] && sudo rm /etc/apt/keyrings/packages.microsoft.gpg
  cd /tmp
  wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor >packages.microsoft.gpg
  sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
  echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list >/dev/null
  rm -f packages.microsoft.gpg
  cd -
fi

sudo apt update
sudo apt install -y code

# Restore the curated extension set (configs/vscode-extensions.txt)
ext_list="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)/configs/vscode-extensions.txt"
if [ -f "$ext_list" ]; then
  echo "Installing VSCode extensions from $ext_list..."
  while read -r ext; do
    [ -n "$ext" ] && code --install-extension "$ext" >/dev/null 2>&1 || true
  done < "$ext_list"
fi
