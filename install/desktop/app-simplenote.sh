#!/bin/bash

cd /tmp

SIMPLENOTE_VERSION=$(curl -s https://api.github.com/repos/Automattic/simplenote-electron/releases/latest | grep -Po '"tag_name": "v\K[^"]*')
DEB_FILE="Simplenote-linux-${SIMPLENOTE_VERSION}-amd64.deb"
DOWNLOAD_URL="https://github.com/Automattic/simplenote-electron/releases/download/v${SIMPLENOTE_VERSION}/${DEB_FILE}"

echo "Downloading Simplenote ${SIMPLENOTE_VERSION}..."
curl -fSL -o simplenote.deb "${DOWNLOAD_URL}"

echo "Installing Simplenote..."
sudo apt install -y ./simplenote.deb

rm -f simplenote.deb
cd -
echo "Simplenote installation complete."