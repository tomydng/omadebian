#!/bin/bash

# Configure the bash shell using Omadebian defaults
# [ -f ~/.bashrc ] && mv ~/.bashrc ~/.bashrc.bak
# cp ~/.local/share/omadebian/configs/bashrc ~/.bashrc
[ -f ~/.zshrc ] && mv ~/.zshrc ~/.zshrc.bak
cp ~/.local/share/omadebian/configs/zshrc ~/.zshrc

# Load the PATH for use later in the installers
# source ~/.local/share/omadebian/defaults/bash/shell
source ~/.local/share/omadebian/defaults/zsh/shell

[ -f ~/.inputrc ] && mv ~/.inputrc ~/.inputrc.bak
# Configure the inputrc using Omadebian defaults
cp ~/.local/share/omadebian/configs/inputrc ~/.inputrc
