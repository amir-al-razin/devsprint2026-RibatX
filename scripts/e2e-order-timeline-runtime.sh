#!/usr/bin/env bash
set -euo pipefail

BASE_GATEWAY="http://localhost:3000"
BASE_IDENTITY="http://localhost:3001"
BASE_STOCK="http://localhost:3002"

for u in "$BASE_GATEWAY/health" "$BASE_IDENTITY/health" "$BASE_STOCK/health"; do
  code=$(curl -s -o /tmp/tl_h.out -w "%{http_code}" "$u")
  echo "health $u -> $code"
  if [ "$code" != "200" ]; then
    echo "Health check failed for $u"
    cat /tmp/tl_h.out
    exit 1
  fi
done

TEST_STUDENT_ID="tl-$(date +%s)$RANDOM"
TEST_PASSWORD="pass1234"

curl -s -X POST "$BASE_IDENTITY/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$TEST_STUDENT_ID\",\"name\":\"Timeline Tester\",\"password\":\"$TEST_PASSWORD\"}" > /tmp/tl_register.json

LOGIN_JSON=$(curl -s -X POST "$BASE_IDENTITY/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$TEST_STUDENT_ID\",\"password\":\"$TEST_PASSWORD\"}")
TOKEN=$(printf '%s' "$LOGIN_JSON" | python3 -c "import sys,json;o=json.load(sys.stdin);print(o.get('access_token') or o.get('accessToken') or '')")
if [ -z "$TOKEN" ]; then
  echo "Failed to obtain token"
  cat /tmp/tl_register.json
  echo "$LOGIN_JSON"
  exit 1
fi

ITEM_ID=$(curl -s "$BASE_STOCK/stock/items" | python3 -c "import sys,json;a=json.load(sys.stdin);print(a[0]['id'])")
KEY="tl-$(date +%s)-$RANDOM"

POST_CODE=$(curl -s -o /tmp/tl_order.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":\"$ITEM_ID\"}")
ORDER_BODY=$(cat /tmp/tl_order.json)
ORDER_ID=$(printf '%s' "$ORDER_BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('orderId',''))")

if [ "$POST_CODE" != "201" ] || [ -z "$ORDER_ID" ]; then
  echo "Order create failed"
  echo "code=$POST_CODE body=$ORDER_BODY"
  exit 1
fi

echo "orderId=$ORDER_ID"

READY_FOUND=0
LAST_TIMELINE='{}'
for i in {1..12}; do
  TL_CODE=$(curl -s -o /tmp/tl_timeline.json -w "%{http_code}" "$BASE_GATEWAY/orders/$ORDER_ID/timeline" -H "Authorization: Bearer $TOKEN")
  LAST_TIMELINE=$(cat /tmp/tl_timeline.json)
  HAS_READY=$(printf '%s' "$LAST_TIMELINE" | python3 -c "import sys,json;d=json.load(sys.stdin);t=d.get('timeline',[]);print('1' if any(x.get('status')=='READY' for x in t) else '0')")
  echo "poll#$i code=$TL_CODE ready=$HAS_READY"
  if [ "$TL_CODE" = "200" ] && [ "$HAS_READY" = "1" ]; then
    READY_FOUND=1
    break
  fi
  sleep 1
done

echo "=== ORDER ==="
echo "POST /orders code: $POST_CODE"
echo "POST /orders body: $ORDER_BODY"

echo "=== TIMELINE ==="
echo "$LAST_TIMELINE"

if [ "$READY_FOUND" != "1" ]; then
  echo "READY status not observed in timeline within timeout"
  exit 1
fi

printf '%s' "$LAST_TIMELINE" | python3 -c "import sys,json;d=json.load(sys.stdin);t=d.get('timeline',[]);s=[x.get('status') for x in t];print('statuses=' + ' -> '.join(s))"

HAS_VERIFIED=$(printf '%s' "$LAST_TIMELINE" | python3 -c "import sys,json;d=json.load(sys.stdin);t=d.get('timeline',[]);print('1' if any(x.get('status')=='STOCK_VERIFIED' for x in t) else '0')")
if [ "$HAS_VERIFIED" != "1" ]; then
  echo "STOCK_VERIFIED status not observed in timeline"
  exit 1
fi
