#!/usr/bin/env bash
# Filters sessions started within the last hour
source "$(dirname "$0")/fetch_token.sh"

FROM=$(date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ")
TO=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ")

curl -s "http://localhost:8080/api/sessions/recordings?from=$FROM&to=$TO" \
  -H "Authorization: Bearer $TOKEN" | jq
