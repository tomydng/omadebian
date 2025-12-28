#!/bin/bash

flatpak install flathub dev.deedles.Trayscale -y

# Make sure normal user can handle Tailscale
sudo tailscale set --operator=$USER
