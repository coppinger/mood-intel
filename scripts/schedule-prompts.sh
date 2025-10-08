#!/bin/bash

# Script to send mood check-in prompts via PocketBase backend
# Supports both SMS and WhatsApp channels
#
# Usage:
#   ./schedule-prompts.sh                    # Send via WhatsApp (default)
#   ./schedule-prompts.sh sms                # Send via SMS
#   ./schedule-prompts.sh whatsapp           # Send via WhatsApp (explicit)
#
# Required environment variables:
#   BACKEND_URL      - Your PocketBase backend URL (default: http://localhost:8080)
#   ADMIN_TOKEN      - PocketBase admin authentication token
#   PHONE_NUMBER     - Target phone number in E.164 format (e.g., +64211234567)

set -e

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
CHANNEL="${1:-whatsapp}"  # Default to WhatsApp, can override with first argument

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required environment variables
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}Error: ADMIN_TOKEN environment variable not set${NC}"
    echo ""
    echo "To get your admin token, run:"
    echo "  curl -X POST $BACKEND_URL/api/admins/auth-with-password \\"
    echo "    -H \"Content-Type: application/json\" \\"
    echo "    -d '{\"identity\":\"your@email.com\",\"password\":\"yourpassword\"}'"
    echo ""
    exit 1
fi

if [ -z "$PHONE_NUMBER" ]; then
    echo -e "${YELLOW}Warning: PHONE_NUMBER not set, using backend default${NC}"
    PHONE_NUMBER=""
fi

# Validate channel
if [ "$CHANNEL" != "sms" ] && [ "$CHANNEL" != "whatsapp" ]; then
    echo -e "${RED}Error: Invalid channel '$CHANNEL'${NC}"
    echo "Usage: $0 [sms|whatsapp]"
    exit 1
fi

echo "==================================="
echo "Mood Check-In Prompt Sender"
echo "==================================="
echo "Backend URL: $BACKEND_URL"
echo "Channel:     $CHANNEL"
echo "Phone:       ${PHONE_NUMBER:-<using backend default>}"
echo ""

# Build JSON payload
if [ -n "$PHONE_NUMBER" ]; then
    PAYLOAD="{\"phone_number\": \"$PHONE_NUMBER\", \"channel\": \"$CHANNEL\"}"
else
    PAYLOAD="{\"channel\": \"$CHANNEL\"}"
fi

# Send prompt
echo "Sending prompt..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/sms/send-prompt" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (everything except last line)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check if request was successful
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Prompt sent successfully via $CHANNEL${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo "Check your phone for the message!"
else
    echo -e "${RED}✗ Failed to send prompt (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""

    # Common error hints
    if [ "$HTTP_CODE" -eq 401 ]; then
        echo -e "${YELLOW}Hint: Check that your ADMIN_TOKEN is valid and not expired${NC}"
    elif [ "$HTTP_CODE" -eq 500 ]; then
        echo -e "${YELLOW}Hint: Check backend logs for Twilio API errors${NC}"
        echo "  flyctl logs -a mood-intel-backend"
    fi

    exit 1
fi

echo "==================================="
echo ""
echo "For automated scheduling, see:"
echo "  docs/SCHEDULING_SETUP.md"
