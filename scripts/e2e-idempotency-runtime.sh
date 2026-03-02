#!/usr/bin/env bash
set -euo pipefail

BASE_GATEWAY="http://localhost:3000"
BASE_IDENTITY="http://localhost:3001"
BASE_STOCK="http://localhost:3002"

TEST_STUDENT_ID="rt-$(date +%s)$RANDOM"
TEST_PASSWORD="pass1234"

for u in "$BASE_GATEWAY/health" "$BASE_IDENTITY/health" "$BASE_STOCK/health"; do
  code=$(curl -s -o /tmp/h.out -w "%{http_code}" "$u")
  echo "health $u -> $code"
  if [ "$code" != "200" ]; then
    echo "Health check failed for $u"
    cat /tmp/h.out
    exit 1
  fi
done

REGISTER_PAYLOAD="{\"studentId\":\"$TEST_STUDENT_ID\",\"name\":\"Runtime Tester\",\"password\":\"$TEST_PASSWORD\"}"
curl -s -X POST "$BASE_IDENTITY/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD" > /tmp/register_user.json

LOGIN_JSON=$(curl -s -X POST "$BASE_IDENTITY/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$TEST_STUDENT_ID\",\"password\":\"$TEST_PASSWORD\"}")
TOKEN=$(printf '%s' "$LOGIN_JSON" | python3 -c "import sys,json;obj=json.load(sys.stdin);print(obj.get('accessToken') or obj.get('access_token') or '')")
if [ -z "$TOKEN" ]; then
  echo "Failed to obtain token"
  echo "Registered user payload result:"
  cat /tmp/register_user.json
  echo "$LOGIN_JSON"
  exit 1
fi

ITEMS_JSON=$(curl -s "$BASE_STOCK/stock/items")
ITEM_ID=$(printf '%s' "$ITEMS_JSON" | python3 -c "import sys,json;a=json.load(sys.stdin);print(a[0]['id'])")
QTY_BEFORE=$(printf '%s' "$ITEMS_JSON" | python3 -c "import sys,json;a=json.load(sys.stdin);print(a[0]['quantity'])")

echo "Using itemId=$ITEM_ID qty_before=$QTY_BEFORE"

REAL_KEY="real-$(date +%s)-$RANDOM"
REAL_CODE=$(curl -s -o /tmp/real_order.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $REAL_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":\"$ITEM_ID\"}")
REAL_BODY=$(cat /tmp/real_order.json)
REAL_ORDER_ID=$(printf '%s' "$REAL_BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('orderId',''))")

GET_CODE="NA"
GET_BODY=""
if [ -n "$REAL_ORDER_ID" ]; then
  GET_CODE=$(curl -s -o /tmp/get_order.json -w "%{http_code}" "$BASE_GATEWAY/orders/$REAL_ORDER_ID" \
    -H "Authorization: Bearer $TOKEN")
  GET_BODY=$(cat /tmp/get_order.json)
fi

RACE_KEY="race-$(date +%s)-$RANDOM"
(
  curl -s -o /tmp/race1_body.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Idempotency-Key: $RACE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"itemId\":\"$ITEM_ID\"}" > /tmp/race1_code.txt
) &
PID1=$!
(
  curl -s -o /tmp/race2_body.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Idempotency-Key: $RACE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"itemId\":\"$ITEM_ID\"}" > /tmp/race2_code.txt
) &
PID2=$!
wait "$PID1" "$PID2"

R1_CODE=$(cat /tmp/race1_code.txt)
R2_CODE=$(cat /tmp/race2_code.txt)
R1_BODY=$(cat /tmp/race1_body.json)
R2_BODY=$(cat /tmp/race2_body.json)

SEQ_CODE_1=$(curl -s -o /tmp/seq1_body.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $RACE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":\"$ITEM_ID\"}")
SEQ_CODE_2=$(curl -s -o /tmp/seq2_body.json -w "%{http_code}" -X POST "$BASE_GATEWAY/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $RACE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":\"$ITEM_ID\"}")
SEQ_BODY_1=$(cat /tmp/seq1_body.json)
SEQ_BODY_2=$(cat /tmp/seq2_body.json)

QTY_AFTER=$(curl -s "$BASE_STOCK/stock/items/$ITEM_ID" | python3 -c "import sys,json;print(json.load(sys.stdin).get('quantity',''))")

echo "=== REAL SCENARIO ==="
echo "POST /orders code: $REAL_CODE"
echo "POST /orders body: $REAL_BODY"
echo "GET /orders/:id code: $GET_CODE"
echo "GET /orders/:id body: $GET_BODY"

echo "=== RACE SCENARIO (same key, concurrent) ==="
echo "R1 code: $R1_CODE"
echo "R1 body: $R1_BODY"
echo "R2 code: $R2_CODE"
echo "R2 body: $R2_BODY"

echo "=== DUPLICATE RETRY (same key, sequential) ==="
echo "S1 code: $SEQ_CODE_1"
echo "S1 body: $SEQ_BODY_1"
echo "S2 code: $SEQ_CODE_2"
echo "S2 body: $SEQ_BODY_2"

echo "=== STOCK DELTA ==="
echo "qty_before=$QTY_BEFORE qty_after=$QTY_AFTER"
