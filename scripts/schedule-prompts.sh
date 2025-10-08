#!/bin/bash

# Script to set up hourly SMS prompts using Twilio Scheduled Messages
# Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, YOUR_PHONE_NUMBER

set -e

# Check for required environment variables
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ] || [ -z "$TWILIO_PHONE_NUMBER" ] || [ -z "$YOUR_PHONE_NUMBER" ]; then
    echo "Error: Missing required environment variables"
    echo "Please set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, YOUR_PHONE_NUMBER"
    exit 1
fi

MESSAGE="Quick check-in: Mood (1-5), Energy (L/M/H), Doing, Next hour?"

echo "Setting up hourly SMS prompts (8am-10pm)..."

# Create scheduled messages for each hour
for hour in {8..22}; do
    # Format hour for Twilio (must be in format: "2024-01-01T08:00:00Z")
    # We'll use a cron-style expression instead

    curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
        -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
        --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
        --data-urlencode "To=$YOUR_PHONE_NUMBER" \
        --data-urlencode "Body=$MESSAGE" \
        --data-urlencode "MessagingServiceSid=" \
        --data-urlencode "ScheduleType=fixed" \
        --data-urlencode "SendAt=$(date -u -d "+1 hour" +%Y-%m-%dT%H:00:00Z)"

    echo "Scheduled prompt for ${hour}:00"
done

echo "Done! Prompts scheduled for hours 8am-10pm"
echo ""
echo "Note: This creates one-time scheduled messages."
echo "For recurring messages, consider using:"
echo "  1. Twilio Messaging Services with recurring schedules"
echo "  2. A cron job calling the send-prompt endpoint"
echo "  3. GitHub Actions workflow"
