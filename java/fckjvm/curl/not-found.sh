#!/usr/bin/env bash
source "$(dirname "$0")/fetch_token.sh"

curl -s http://localhost:8080/api/sessions/recordings/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN" | jq
