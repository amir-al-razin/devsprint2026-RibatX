#!/usr/bin/env bash
set -euo pipefail

BASE_GATEWAY="http://localhost:3000"

health_code=$(curl -s -o /tmp/gw_auth_health.json -w "%{http_code}" "$BASE_GATEWAY/health")
echo "gateway health -> $health_code"
if [ "$health_code" != "200" ]; then
  cat /tmp/gw_auth_health.json
  exit 1
fi

STUDENT_ID="gw-auth-$(date +%s)$RANDOM"
PASSWORD="pass1234"

REGISTER_CODE=$(curl -s -o /tmp/gw_register.json -w "%{http_code}" -X POST "$BASE_GATEWAY/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\",\"name\":\"Gateway Auth\",\"password\":\"$PASSWORD\"}")
REGISTER_BODY=$(cat /tmp/gw_register.json)

echo "register code=$REGISTER_CODE"
echo "register body=$REGISTER_BODY"
if [ "$REGISTER_CODE" != "201" ]; then
  exit 1
fi

LOGIN_CODE=$(curl -s -o /tmp/gw_login.json -w "%{http_code}" -X POST "$BASE_GATEWAY/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\",\"password\":\"$PASSWORD\"}")
LOGIN_BODY=$(cat /tmp/gw_login.json)
TOKEN=$(printf '%s' "$LOGIN_BODY" | python3 -c "import sys,json;o=json.load(sys.stdin);print(o.get('access_token') or o.get('accessToken') or '')")

echo "login code=$LOGIN_CODE"
echo "login body=$LOGIN_BODY"
if [ "$LOGIN_CODE" != "201" ] || [ -z "$TOKEN" ]; then
  exit 1
fi

# Verify identity rate-limit is still enforced via gateway passthrough
for i in 1 2 3 4; do
  code=$(curl -s -o "/tmp/gw_rl_$i.json" -w "%{http_code}" -X POST "$BASE_GATEWAY/auth/login" \
    -H "Content-Type: application/json" \
    -d '{}')
  body=$(cat "/tmp/gw_rl_$i.json")
  echo "gateway rate-limit request $i: HTTP $code body=$body"
done

rl4=$(curl -s -o /tmp/gw_rl_check.json -w "%{http_code}" -X POST "$BASE_GATEWAY/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "gateway rate-limit check: HTTP $rl4"
if [ "$rl4" != "429" ]; then
  exit 1
fi

echo "gateway auth runtime test: PASS"
