#!/bin/bash

if [[ -v OMADEBIAN_FIRST_RUN_OPTIONAL_APPS ]]; then
	apps=$OMADEBIAN_FIRST_RUN_OPTIONAL_APPS

	if [[ -n "$apps" ]]; then
		for app in $apps; do
			source "$OMADEBIAN_PATH/install/desktop/optional/app-${app,,}.sh"
		done
	fi
fi
