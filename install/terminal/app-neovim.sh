#!/bin/bash

cd /tmp
wget -O nvim.tar.gz "https://github.com/neovim/neovim/releases/download/stable/nvim-linux-x86_64.tar.gz"
tar -xf nvim.tar.gz
sudo install nvim-linux-x86_64/bin/nvim /usr/local/bin/nvim
sudo cp -R nvim-linux-x86_64/lib /usr/local/
sudo cp -R nvim-linux-x86_64/share /usr/local/
rm -rf nvim-linux-x86_64 nvim.tar.gz
cd -

if [ ! -d "$HOME/.config/nvim" ]; then
  mkdir -p ~/.config/nvim/plugin/after
  cp "$OMADEBIAN_PATH/configs/neovim/transparency.lua" ~/.config/nvim/plugin/after/
  cp "$OMADEBIAN_PATH/configs/neovim/init.lua" ~/.config/nvim/init.lua
fi
