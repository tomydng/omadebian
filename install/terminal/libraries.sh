#!/bin/bash

sudo apt install -y \
  build-essential pkg-config autoconf clang rustc pipx \
  libssl-dev libreadline-dev zlib1g-dev libffi-dev \
  sqlite3 libsqlite3-0 libpq-dev postgresql-client postgresql-client-common \
  libmariadb-dev-compat libmariadb-dev mariadb-client redis-tools \
  wamerican resolvconf protobuf-compiler
