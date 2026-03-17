#!/usr/bin/env bash
source "$(dirname "$0")/fetch_token.sh"

SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
NOW=$(date +%s000)

curl -s -X POST http://localhost:8080/api/sessions/recordings/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"events\": [
      { \"type\": \"PAGE_LOAD\",   \"timestamp\": $NOW,          \"data\": { \"url\": \"https://example.com\" } },
      { \"type\": \"MOUSE_CLICK\", \"timestamp\": $((NOW+1000)), \"data\": { \"x\": 100, \"y\": 200, \"selector\": \"#btn\" } },
      { \"type\": \"SCROLL\",      \"timestamp\": $((NOW+2000)), \"data\": { \"scrollY\": 500 } },
      { \"type\": \"PAGE_UNLOAD\", \"timestamp\": $((NOW+5000)), \"data\": {} }
    ],
    \"metadata\": {
      \"initialUrl\": \"https://example.com\",
      \"userAgent\": \"curl/1.0\",
      \"screenWidth\": 1920,
      \"screenHeight\": 1080
    }
  }"

echo ""
echo "SESSION_ID=$SESSION_ID"
