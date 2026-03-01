#!/bin/bash

# --- CONFIGURATION ---
LOGIN_URL="https://identity-production-08d3.up.railway.app/auth/login"
ORDER_URL="https://gateway-production-3aa4.up.railway.app/orders"
STUDENT_ID="117"
PASSWORD="pass1234"
ITEM_ID="cmm72wnby0000p2l0n18dt3ai"

TOTAL_ORDERS=1000
CONCURRENCY=50 

echo "🔑 Step 1: Logging in as $STUDENT_ID..."

# We capture the full response
RESPONSE=$(curl -s -X POST "$LOGIN_URL" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_ID\",\"password\":\"$PASSWORD\"}")

# FIXED: Looking for "access_token" specifically
TOKEN=$(echo $RESPONSE | grep -oP '(?<="access_token":")[^"]*')

if [ -z "$TOKEN" ]; then
    echo "❌ Token extraction failed!"
    echo "Response was: $RESPONSE"
    exit 1
fi

echo "✅ Token obtained. Starting stress test of $TOTAL_ORDERS orders..."
START_TIME=$(date +%s)

# --- ORDER FUNCTION ---
send_order() {
    local order_num=$1
    # Unique key ensures the backend treats every request as a new order
    local IDEMP_KEY="stress-test-$STUDENT_ID-$(date +%s%N)-$order_num"

    curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$ORDER_URL" \
      -H "authorization: Bearer $TOKEN" \
      -H "content-type: application/json" \
      -H "x-idempotency-key: $IDEMP_KEY" \
      -H "origin: https://web-production-121cd.up.railway.app" \
      --data-raw "{\"itemId\":\"$ITEM_ID\"}"
}

export -f send_order
export ORDER_URL TOKEN STUDENT_ID ITEM_ID

# --- EXECUTION ---
# Firing parallel requests
seq $TOTAL_ORDERS | xargs -n 1 -P $CONCURRENCY -I {} bash -c 'res=$(send_order {}); echo "Order {}: Status $res"'

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
AVG_TPS=$((TOTAL_ORDERS / DURATION))

echo "--------------------------------------"
echo "🏁 Done! Total Time: $DURATION seconds"
echo "📈 Average Throughput: $AVG_TPS orders/sec"
echo "--------------------------------------"