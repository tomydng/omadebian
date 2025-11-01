#!/bin/bash

set -e

ascii_art='
                                         /$$           /$$       /$$                    
                                        | $$          | $$      |__/                    
  /$$$$$$  /$$$$$$/$$$$   /$$$$$$   /$$$$$$$  /$$$$$$ | $$$$$$$  /$$  /$$$$$$  /$$$$$$$ 
 /$$__  $$| $$_  $$_  $$ |____  $$ /$$__  $$ /$$__  $$| $$__  $$| $$ |____  $$| $$__  $$
| $$  \ $$| $$ \ $$ \ $$  /$$$$$$$| $$  | $$| $$$$$$$$| $$  \ $$| $$  /$$$$$$$| $$  \ $$
| $$  | $$| $$ | $$ | $$ /$$__  $$| $$  | $$| $$_____/| $$  | $$| $$ /$$__  $$| $$  | $$
|  $$$$$$/| $$ | $$ | $$|  $$$$$$$|  $$$$$$$|  $$$$$$$| $$$$$$$/| $$|  $$$$$$$| $$  | $$
 \______/ |__/ |__/ |__/ \_______/ \_______/ \_______/|_______/ |__/ \_______/|__/  |__/
'

echo -e "$ascii_art"
echo "=> Omadebian is for fresh Debian 13+ installations only!"
echo -e "\nBegin installation (or abort with ctrl+c)..."

sudo apt-get update >/dev/null
sudo apt-get install -y git >/dev/null

echo "Cloning Omadebian..."
rm -rf ~/.local/share/omadebian
git clone https://github.com/tomydng/omadebian.git ~/.local/share/omadebian >/dev/null

echo "Installation starting..."
source ~/.local/share/omadebian/install.sh
