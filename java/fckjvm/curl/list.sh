#!/usr/bin/env bash
# Usage: ./list.sh [page] [size]
source "$(dirname "$0")/fetch_token.sh"

PAGE=${1:-0}
SIZE=${2:-10}

curl -s "http://localhost:8080/api/sessions/recordings?page=$PAGE&size=$SIZE" \
  -H "Authorization: Bearer $TOKEN" | jq
