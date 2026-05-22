#!/bin/bash

curl -sS https://starship.rs/install.sh | sh -s -- -y

cp "$OMADEBIAN_PATH/configs/starship.toml" ~/.config/starship.toml
