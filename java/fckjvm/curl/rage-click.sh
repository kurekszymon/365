#!/usr/bin/env bash
# Ingests 3 rapid clicks on the same spot → triggers RAGE_CLICK signal
source "$(dirname "$0")/fetch_token.sh"

SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
NOW=$(date +%s000)

curl -s -X POST http://localhost:8080/api/sessions/recordings/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"events\": [
      { \"type\": \"MOUSE_CLICK\", \"timestamp\": $NOW,          \"data\": { \"x\": 100, \"y\": 200, \"selector\": \"#btn\" } },
      { \"type\": \"MOUSE_CLICK\", \"timestamp\": $((NOW+100)),  \"data\": { \"x\": 102, \"y\": 201, \"selector\": \"#btn\" } },
      { \"type\": \"MOUSE_CLICK\", \"timestamp\": $((NOW+200)),  \"data\": { \"x\": 99,  \"y\": 199, \"selector\": \"#btn\" } }
    ],
    \"metadata\": { \"initialUrl\": \"https://example.com\", \"userAgent\": \"curl\", \"screenWidth\": 1920, \"screenHeight\": 1080 }
  }"

echo ""
echo "SESSION_ID=$SESSION_ID"
echo ""
echo "Signals:"
curl -s http://localhost:8080/api/sessions/recordings/$SESSION_ID/signals \
  -H "Authorization: Bearer $TOKEN" | jq
