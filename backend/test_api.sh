#!/bin/bash

# Garena Automation Test Script
# This script tests the automation API endpoints

echo \"=====================================\"
echo \"Garena Automation API Test\"
echo \"=====================================\"
echo \"\"

BASE_URL=\"http://localhost:8001/api\"

# Test 1: Check API is alive
echo \"[TEST 1] Checking API health...\"
HEALTH=$(curl -s $BASE_URL/)
echo \"Response: $HEALTH\"
echo \"\"

# Test 2: Get statistics
echo \"[TEST 2] Getting automation statistics...\"
STATS=$(curl -s $BASE_URL/automation/stats)
echo \"Response: $STATS\"
echo \"\"

# Test 3: Create a test order
echo \"[TEST 3] Creating test top-up order...\"
ORDER=$(curl -s -X POST $BASE_URL/automation/topup \
  -H \"Content-Type: application/json\" \
  -d '{\"player_uid\":\"301372144\",\"diamond_amount\":25}')
echo \"Response: $ORDER\"

ORDER_ID=$(echo $ORDER | jq -r '.order_id')
echo \"Order ID: $ORDER_ID\"
echo \"\"

# Wait for processing
echo \"[TEST 4] Waiting 10 seconds for processing...\"
sleep 10

# Test 5: Check order status
echo \"[TEST 5] Checking order status...\"
ORDER_STATUS=$(curl -s $BASE_URL/automation/orders/$ORDER_ID)
echo \"Response: $ORDER_STATUS\"
echo \"\"

# Test 6: Get all orders
echo \"[TEST 6] Getting all orders...\"
ORDERS=$(curl -s \"$BASE_URL/automation/orders?limit=5\")
echo \"Response: $ORDERS\"
echo \"\"

# Test 7: Get updated statistics
echo \"[TEST 7] Getting updated statistics...\"
FINAL_STATS=$(curl -s $BASE_URL/automation/stats)
echo \"Response: $FINAL_STATS\"
echo \"\"

echo \"=====================================\"
echo \"Test Complete!\"
echo \"=====================================\"
echo \"\"
echo \"Check screenshots at: /tmp/garena_screenshots/\"
echo \"Check logs at: /var/log/supervisor/backend.err.log\"
