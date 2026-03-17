#!/usr/bin/env bash
export TOKEN=$(curl -s -X POST \
  http://localhost:8180/realms/fckjvm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=fckjvm_cli" \
  -d "username=fckjvm" \
  -d "password=fckjvm" \
  | jq -r '.access_token')