#!/bin/bash

mkdir -p ~/.config/ripgrep
[ ! -f "$HOME/.config/ripgrep/ripgreprc" ] && cp ~/.local/share/omadebian/configs/ripgreprc ~/.config/ripgrep/ripgreprc || true
