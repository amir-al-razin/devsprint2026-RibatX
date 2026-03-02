#!/usr/bin/env bash
set -euo pipefail

BASE_GATEWAY="http://localhost:3000"
BASE_IDENTITY="http://localhost:3001"
BASE_STOCK="http://localhost:3002"
BASE_KITCHEN="http://localhost:3003"
BASE_NOTIFICATION="http://localhost:3004"

# health precheck
for u in "$BASE_GATEWAY/health" "$BASE_IDENTITY/health" "$BASE_STOCK/health" "$BASE_KITCHEN/health" "$BASE_NOTIFICATION/health"; do
  code=$(curl -s -o /tmp/chaos_h.out -w "%{http_code}" "$u")
  echo "health $u -> $code"
  if [ "$code" != "200" ]; then
    cat /tmp/chaos_h.out
    exit 1
  fi
done

JWT_SECRET=$(docker exec ribatx_gateway printenv JWT_SECRET || true)
if [ -z "$JWT_SECRET" ]; then
  echo "JWT_SECRET is not available in gateway container"
  exit 1
fi

ADMIN_TOKEN=$(JWT_SECRET="$JWT_SECRET" python3 - <<'PY'
import base64, hmac, hashlib, json, os, time

secret = os.environ['JWT_SECRET'].encode('utf-8')
header = {'alg':'HS256','typ':'JWT'}
now = int(time.time())
payload = {'sub':'admin-chaos-script','name':'Chaos Admin','role':'admin','iat':now,'exp':now+3600}

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip('=')

segments = [
    b64url(json.dumps(header, separators=(',', ':')).encode()),
    b64url(json.dumps(payload, separators=(',', ':')).encode()),
]
signing_input = '.'.join(segments).encode()
sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
print('.'.join([segments[0], segments[1], b64url(sig)]))
PY
)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to forge admin token"
  exit 1
fi

chaos_toggle() {
  service="$1"
  enabled="$2"
  code=$(curl -s -o /tmp/chaos_toggle.json -w "%{http_code}" -X POST "$BASE_GATEWAY/admin/chaos" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"service\":\"$service\",\"enabled\":$enabled}")
  body=$(cat /tmp/chaos_toggle.json)
  echo "toggle $service=$enabled -> $code $body"
  if [ "$code" != "201" ]; then
    exit 1
  fi
}

chaos_status() {
  service="$1"
  expected="$2"
  code=$(curl -s -o /tmp/chaos_status.json -w "%{http_code}" "$BASE_GATEWAY/admin/chaos/status?service=$service" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  body=$(cat /tmp/chaos_status.json)
  mode=$(printf '%s' "$body" | python3 -c "import sys,json;print(json.load(sys.stdin).get('chaosMode',''))")
  echo "status $service -> $code $body"
  if [ "$code" != "200" ] || [ "$mode" != "$expected" ]; then
    exit 1
  fi
}

expect_code() {
  name="$1"
  expected="$2"
  shift 2
  code=$("$@")
  echo "$name -> $code (expected $expected)"
  if [ "$code" != "$expected" ]; then
    exit 1
  fi
}

# reset chaos flags first
for service in gateway identity stock kitchen notification; do
  chaos_toggle "$service" false
  chaos_status "$service" OFF
done

# create student for gateway order test
STUDENT_ID="chaos-student-$(date +%s)$RANDOM"
PASSWORD="pass1234"

reg_code=$(curl -s -o /tmp/chaos_reg.json -w "%{http_code}" -X POST "$BASE_GATEWAY/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\",\"name\":\"Chaos Student\",\"password\":\"$PASSWORD\"}")
if [ "$reg_code" != "201" ]; then
  echo "student register failed code=$reg_code body=$(cat /tmp/chaos_reg.json)"
  exit 1
fi

login_code=$(curl -s -o /tmp/chaos_login.json -w "%{http_code}" -X POST "$BASE_GATEWAY/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\",\"password\":\"$PASSWORD\"}")
if [ "$login_code" != "201" ]; then
  echo "student login failed code=$login_code body=$(cat /tmp/chaos_login.json)"
  exit 1
fi

STUDENT_TOKEN=$(python3 - <<'PY'
import json
with open('/tmp/chaos_login.json') as f:
    obj=json.load(f)
print(obj.get('access_token') or obj.get('accessToken') or '')
PY
)
if [ -z "$STUDENT_TOKEN" ]; then
  echo "student token missing"
  exit 1
fi

ITEM_ID=$(curl -s "$BASE_STOCK/stock/items" | python3 -c "import sys,json;a=json.load(sys.stdin);print(a[0]['id'])")

# identity chaos
chaos_toggle identity true
chaos_status identity ON
expect_code "identity /auth/login under chaos" 503 curl -s -o /tmp/chaos_identity.json -w "%{http_code}" -X POST "$BASE_IDENTITY/auth/login" -H "Content-Type: application/json" -d '{}'
chaos_toggle identity false
chaos_status identity OFF
expect_code "identity /health after disable" 200 curl -s -o /tmp/chaos_identity_recover.json -w "%{http_code}" "$BASE_IDENTITY/health"

# stock chaos
chaos_toggle stock true
chaos_status stock ON
expect_code "stock /stock/items under chaos" 503 curl -s -o /tmp/chaos_stock.json -w "%{http_code}" "$BASE_STOCK/stock/items"
chaos_toggle stock false
chaos_status stock OFF
expect_code "stock /stock/items after disable" 200 curl -s -o /tmp/chaos_stock_recover.json -w "%{http_code}" "$BASE_STOCK/stock/items"

# kitchen chaos
chaos_toggle kitchen true
chaos_status kitchen ON
expect_code "kitchen /queue/length under chaos" 503 curl -s -o /tmp/chaos_kitchen.json -w "%{http_code}" "$BASE_KITCHEN/queue/length"
chaos_toggle kitchen false
chaos_status kitchen OFF
expect_code "kitchen /queue/length after disable" 200 curl -s -o /tmp/chaos_kitchen_recover.json -w "%{http_code}" "$BASE_KITCHEN/queue/length"

# notification chaos
chaos_toggle notification true
chaos_status notification ON
expect_code "notification /notify under chaos" 503 curl -s -o /tmp/chaos_notification.json -w "%{http_code}" -X PATCH "$BASE_NOTIFICATION/notify/TEST-CHAOS" -H "Content-Type: application/json" -d '{"status":"READY","studentId":"x"}'
chaos_toggle notification false
chaos_status notification OFF
expect_code "notification /health after disable" 200 curl -s -o /tmp/chaos_notification_recover.json -w "%{http_code}" "$BASE_NOTIFICATION/health"

# gateway chaos impacts order placement
chaos_toggle gateway true
chaos_status gateway ON
expect_code "gateway POST /orders under chaos" 503 curl -s -o /tmp/chaos_gateway_order.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" -H "Authorization: Bearer $STUDENT_TOKEN" -H "X-Idempotency-Key: chaos-gw-$(date +%s)-$RANDOM" -H "Content-Type: application/json" -d "{\"itemId\":\"$ITEM_ID\"}"
chaos_toggle gateway false
chaos_status gateway OFF
expect_code "gateway POST /orders after disable" 201 curl -s -o /tmp/chaos_gateway_order_recover.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" -H "Authorization: Bearer $STUDENT_TOKEN" -H "X-Idempotency-Key: chaos-gw-ok-$(date +%s)-$RANDOM" -H "Content-Type: application/json" -d "{\"itemId\":\"$ITEM_ID\"}"

echo "chaos runtime test: PASS"
