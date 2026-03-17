#!/usr/bin/env bash
# Usage: ./filter-signal.sh [RAGE_CLICK|DEAD_CLICK]
source "$(dirname "$0")/fetch_token.sh"

SIGNAL=${1:-RAGE_CLICK}

curl -s "http://localhost:8080/api/sessions/recordings?hasSignal=$SIGNAL" \
  -H "Authorization: Bearer $TOKEN" | jq
