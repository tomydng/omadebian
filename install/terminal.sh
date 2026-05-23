#!/bin/bash

export PATH="$HOME/.local/bin:$PATH"

run() {
  local name
  name=$(basename "$1")
  echo "→ $name"
  bash "$1" || echo "  Warning: $name failed, continuing..."
}

# System update and base packages
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y curl git unzip lsb-release

# Shell (zsh)
sudo apt install -y zsh
sudo usermod -s "$(which zsh)" "$USER"
run "$OMADEBIAN_PATH/install/terminal/a-shell.sh"

# Show asterisks when typing sudo password
echo 'Defaults pwfeedback' | sudo tee /etc/sudoers.d/pwfeedback > /dev/null
sudo chmod 440 /etc/sudoers.d/pwfeedback

# Build tools and libraries
sudo apt install -y \
  build-essential pkg-config autoconf clang rustc pipx \
  libssl-dev libreadline-dev zlib1g-dev libffi-dev \
  sqlite3 libsqlite3-0 libpq-dev postgresql-client postgresql-client-common \
  libmariadb-dev-compat libmariadb-dev mariadb-client redis-tools \
  wamerican protobuf-compiler

# CLI tools
sudo apt install -y \
  tree fzf ripgrep bat eza zoxide rsync plocate apache2-utils \
  fd-find zip direnv git-delta ffmpeg just

# btop (resource monitor)
sudo apt install -y btop
mkdir -p ~/.config/btop
cp "$OMADEBIAN_PATH/configs/btop.conf" ~/.config/btop/btop.conf

# fastfetch (system info)
sudo apt install -y fastfetch
if [ ! -f "$HOME/.config/fastfetch/config.jsonc" ]; then
  mkdir -p ~/.config/fastfetch
  cp "$OMADEBIAN_PATH/configs/fastfetch.jsonc" ~/.config/fastfetch/config.jsonc
fi

# wireguard
sudo apt install -y wireguard

# kubectx
sudo apt install -y kubectx

# tldr (simplified man pages)
pipx install tldr || true

# Docker
run "$OMADEBIAN_PATH/install/terminal/docker.sh"

# Fonts (Cascadia Mono Nerd Font)
run "$OMADEBIAN_PATH/install/terminal/fonts.sh"

# mise (language version manager)
run "$OMADEBIAN_PATH/install/terminal/mise.sh"

# GitHub CLI
run "$OMADEBIAN_PATH/install/terminal/app-github-cli.sh"

# Neovim
run "$OMADEBIAN_PATH/install/terminal/app-neovim.sh"

# Starship prompt
run "$OMADEBIAN_PATH/install/terminal/app-starship.sh"

# lazygit
run "$OMADEBIAN_PATH/install/terminal/app-lazygit.sh"

# lazydocker
run "$OMADEBIAN_PATH/install/terminal/app-lazydocker.sh"

# zellij (terminal multiplexer)
run "$OMADEBIAN_PATH/install/terminal/app-zellij.sh"

# kubectl
run "$OMADEBIAN_PATH/install/terminal/app-kubectl.sh"

# Tailscale
run "$OMADEBIAN_PATH/install/terminal/app-tailscale.sh"

# Ollama (local LLM runner)
curl -fsSL https://ollama.com/install.sh | sh || true

# fcitx5 (Vietnamese input)
run "$OMADEBIAN_PATH/install/terminal/app-fcitx5-unikey.sh"
