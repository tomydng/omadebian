#!/bin/bash

sudo apt install -y alacritty
mkdir -p ~/.config/alacritty
cp "$OMADEBIAN_PATH/configs/alacritty.toml" ~/.config/alacritty/alacritty.toml
cp "$OMADEBIAN_PATH/configs/alacritty/shared.toml" ~/.config/alacritty/shared.toml
cp "$OMADEBIAN_PATH/configs/alacritty/pane.toml" ~/.config/alacritty/pane.toml
cp "$OMADEBIAN_PATH/configs/alacritty/btop.toml" ~/.config/alacritty/btop.toml
cp "$OMADEBIAN_PATH/configs/alacritty/theme.toml" ~/.config/alacritty/theme.toml
cp "$OMADEBIAN_PATH/configs/alacritty/fonts/CaskaydiaMono.toml" ~/.config/alacritty/font.toml
cp "$OMADEBIAN_PATH/configs/alacritty/font-size.toml" ~/.config/alacritty/font-size.toml

alacritty migrate 2>/dev/null || true
alacritty migrate -c ~/.config/alacritty/pane.toml 2>/dev/null || true
alacritty migrate -c ~/.config/alacritty/btop.toml 2>/dev/null || true

sudo update-alternatives --set x-terminal-emulator /usr/bin/alacritty
