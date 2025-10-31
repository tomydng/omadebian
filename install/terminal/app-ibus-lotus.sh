#!/bin/bash

cd /tmp
IBUS_LOTUS_VERSION=$(curl -s "https://api.github.com/repos/LotusInputEngine/ibus-lotus/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
curl -sLo ibus-lotus.zip "https://github.com/LotusInputEngine/ibus-lotus/releases/latest/download/ibus-lotus-${IBUS_LOTUS_VERSION}.zip"
unzip ibus-lotus.zip ibus-lotus
chmod +x ./ibus-lotus/install
sudo ./ibus-lotus/install
rm -rf ibus-lotus.zip ibus-lotus
cd -
