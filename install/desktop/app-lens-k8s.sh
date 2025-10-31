#!/bin/bash

# Lens is a Kubernetes IDE. See https://k8slens.dev/
if [ ! -f /etc/apt/sources.list.d/lens.list ]; then
  # Clean up any existing keyring
  [ -f /usr/share/keyrings/lens-archive-keyring.gpg ] && sudo rm /usr/share/keyrings/lens-archive-keyring.gpg
  
  # Add Lens GPG key
  curl -fsSL https://downloads.k8slens.dev/keys/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/lens-archive-keyring.gpg > /dev/null
  
  # Add Lens repository
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/lens-archive-keyring.gpg] https://downloads.k8slens.dev/apt/debian stable main" | sudo tee /etc/apt/sources.list.d/lens.list > /dev/null
fi

# Update package list and install Lens
sudo apt update
sudo apt install lens -y
