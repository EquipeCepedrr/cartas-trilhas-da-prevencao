#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
printf '%s\n' 'Abra http://localhost:8000 no navegador.'
python3 -m http.server 8000
