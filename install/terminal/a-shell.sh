#!/bin/bash

[ -f ~/.zshrc ] && cp ~/.zshrc ~/.zshrc.bak
cp "$OMADEBIAN_PATH/configs/zshrc" ~/.zshrc

[ -f ~/.inputrc ] && cp ~/.inputrc ~/.inputrc.bak
cp "$OMADEBIAN_PATH/configs/inputrc" ~/.inputrc
