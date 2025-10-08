#!/bin/bash

# Test script for WhatsApp integration
# This script demonstrates how to test both SMS and WhatsApp endpoints

BACKEND_URL="${1:-http://localhost:8080}"
ADMIN_EMAIL="your-admin@example.com"
ADMIN_PASSWORD="your-password"

echo "==================================="
echo "WhatsApp Integration Test Script"
echo "==================================="
echo "Backend URL: $BACKEND_URL"
echo ""

# Note: You'll need to authenticate first to get an admin token
# For now, we'll test the guest-accessible webhook endpoint

echo "Test 1: Simulating SMS message (legacy format)"
echo "----------------------------------------------"
curl -X POST "$BACKEND_URL/api/sms/test-inbound" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "4, H, testing SMS integration, continue testing",
    "from": "+1234567890",
    "channel": "sms"
  }'
echo -e "\n"

echo "Test 2: Simulating WhatsApp message"
echo "------------------------------------"
curl -X POST "$BACKEND_URL/api/sms/test-inbound" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "5, M, testing WhatsApp integration, deploy to production",
    "from": "+1234567890",
    "channel": "whatsapp"
  }'
echo -e "\n"

echo "Test 3: Simulating incoming webhook from Twilio (SMS format)"
echo "-------------------------------------------------------------"
curl -X POST "$BACKEND_URL/api/sms/webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&Body=3%2C%20L%2C%20testing%20direct%20SMS%20webhook%2C%20rest&MessageSid=SM123456"
echo -e "\n"

echo "Test 4: Simulating incoming webhook from Twilio (WhatsApp format)"
echo "------------------------------------------------------------------"
curl -X POST "$BACKEND_URL/api/sms/webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp%3A%2B1234567890&Body=4%2C%20M%2C%20testing%20direct%20WhatsApp%20webhook%2C%20continue%20coding&MessageSid=SM789012"
echo -e "\n"

echo "==================================="
echo "Tests completed!"
echo "==================================="
echo ""
echo "To check results:"
echo "1. Check backend logs: flyctl logs -a mood-intel-backend"
echo "2. View entries in PocketBase admin: $BACKEND_URL/_/"
echo "3. Check the dashboard: https://your-frontend.fly.dev"
echo ""
echo "Next steps for WhatsApp setup:"
echo "1. Enable WhatsApp Sandbox in Twilio Console"
echo "2. Join sandbox by sending 'join <code>' to Twilio WhatsApp number"
echo "3. Send a real WhatsApp message to test"
echo "4. Use the send-prompt endpoint with channel: 'whatsapp'"
