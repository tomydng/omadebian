#!/bin/bash

cd /tmp
IBUS_LOTUS_VERSION=$(curl -s "https://api.github.com/repos/LotusInputEngine/ibus-lotus/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -sLo ibus-lotus-${IBUS_LOTUS_VERSION}.zip "https://github.com/LotusInputEngine/ibus-lotus/releases/latest/download/ibus-lotus-${IBUS_LOTUS_VERSION}.zip"
unzip ibus-lotus-${IBUS_LOTUS_VERSION}.zip
cd ./ibus-lotus-${IBUS_LOTUS_VERSION}
chmod +x ./install
sudo ./install
cd /tmp
rm -rf ibus-lotus-${IBUS_LOTUS_VERSION}.zip ibus-lotus-${IBUS_LOTUS_VERSION}
cd
