#!/usr/bin/env bash
# Usage: ./get-signals.sh <session-id>
source "$(dirname "$0")/fetch_token.sh"

SESSION_ID=${1:?Usage: $0 <session-id>}

curl -s http://localhost:8080/api/sessions/recordings/$SESSION_ID/signals \
  -H "Authorization: Bearer $TOKEN" | jq
