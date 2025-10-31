#!/bin/bash

curl -sS https://starship.rs/install.sh | sh -s -- -y

cp ~/.local/share/omadebian/configs/starship.toml ~/.config/starship.toml
