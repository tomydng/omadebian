#!/bin/bash

[ -f ~/.inputrc ] && cp ~/.inputrc ~/.inputrc.bak
cp "$OMADEBIAN_PATH/configs/inputrc" ~/.inputrc
