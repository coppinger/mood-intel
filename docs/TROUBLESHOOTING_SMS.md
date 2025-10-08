# Troubleshooting SMS Delivery Issues

If you're seeing a successful API response (status 201) but not receiving SMS messages, follow these debugging steps:

## 1. Check Twilio Message Logs

The most reliable way to see what's happening with your messages:

1. Go to https://console.twilio.com/us1/monitor/logs/sms
2. Find your message by the phone number or Message SID (now included in API response)
3. Check the **Status** column:
   - `queued` → Message is waiting to be sent
   - `sent` → Sent to carrier, but not yet delivered
   - `delivered` → Successfully delivered (this is what you want!)
   - `undelivered` → Failed to deliver (check error code)
   - `failed` → Failed to send

4. Click on the message for detailed error information

## 2. Common Issues & Solutions

### Trial Account Restrictions
**Problem:** Twilio trial accounts can only send to verified phone numbers.

**Solution:**
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click "Add a new number"
3. Enter +64221013210 and verify it via SMS or voice call
4. Wait for verification to complete before sending

**How to check:** If using trial account, API will return error code `21608` if number is not verified.

### Phone Number Format Issues
**Problem:** Phone number format doesn't match Twilio's expectations.

**Solution:**
- Use E.164 format: `+64221013210` (country code + number, no spaces/dashes)
- Verify in environment variables:
  ```bash
  fly secrets list  # Check YOUR_PHONE_NUMBER format
  ```

### From Number Not Active
**Problem:** Your Twilio phone number isn't active or properly configured.

**Solution:**
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/active
2. Verify the number in `TWILIO_PHONE_NUMBER` appears in your active numbers
3. Check that SMS is enabled for that number

### Carrier Filtering
**Problem:** Mobile carrier is blocking messages from Twilio.

**Solution:**
- Some carriers block messages from trial numbers
- Some carriers require sender registration
- Check Twilio logs for carrier-specific error codes
- Consider upgrading to a paid account with a registered number

### Geographic Restrictions
**Problem:** Twilio restricts SMS to certain countries on trial accounts.

**Solution:**
1. Go to https://console.twilio.com/us1/develop/sms/settings/geo-permissions
2. Ensure New Zealand is enabled for SMS
3. Upgrade account if needed

## 3. Enhanced Debugging

### Use the Message SID
The API now returns a `messageSid` in the response. Use it to:
```bash
# Get message status via Twilio API
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages/SM..." \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

### Monitor Status Callbacks
The endpoint now includes a status callback URL. Check your logs for:
```
[SMS Status Callback] SID: SMxxx, Status: delivered, To: +64221013210
```

If you see errors:
```
[SMS Error] Code: 30006, Message: Landline or unreachable carrier
```

### Check Backend Logs
```bash
# View real-time logs from Fly.io
fly logs

# Look for these log entries:
# - Twilio Message SID: SMxxx
# - Twilio Message Status: queued/sent/delivered
# - Twilio Error Code: (if any)
```

## 4. Environment Variables Checklist

Verify all required secrets are set:
```bash
fly secrets list
```

Required variables:
- `TWILIO_ACCOUNT_SID` - Your account SID (starts with AC)
- `TWILIO_AUTH_TOKEN` - Your auth token (from Twilio console)
- `TWILIO_PHONE_NUMBER` - Your Twilio number in E.164 format
- `YOUR_PHONE_NUMBER` - Your personal number in E.164 format (+64221013210)
- `CLAUDE_API_KEY` - For processing responses (not needed for sending)

To set secrets:
```bash
fly secrets set TWILIO_ACCOUNT_SID="ACxxxxx"
fly secrets set TWILIO_AUTH_TOKEN="your_auth_token"
fly secrets set TWILIO_PHONE_NUMBER="+1234567890"
fly secrets set YOUR_PHONE_NUMBER="+64221013210"
```

**Note:** The Auth Token can be found in your Twilio Console at:
https://console.twilio.com/us1/develop/runtime/overview

## 5. Test Commands

### Send a test SMS
```bash
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+64221013210"}'
```

### Check the response
Look for:
```json
{
  "success": true,
  "message": "Prompt sent",
  "debug": {
    "status": 201,
    "to": "+64221013210",
    "messageSid": "SMxxxxxxxxx",
    "messageStatus": "queued",
    "errorCode": null,
    "errorMessage": null
  }
}
```

## 6. Quick Diagnosis Flow

1. **Check API response** → Contains `messageSid`?
   - Yes → Message was accepted by Twilio
   - No → Check environment variables and API credentials

2. **Check Twilio logs** → Message status?
   - `delivered` → Check phone/carrier settings
   - `undelivered` → Check error code in logs
   - `failed` → Check "from" number configuration
   - `queued`/`sent` → Wait a few minutes, carriers can be slow

3. **For trial accounts** → Is +64221013210 verified?
   - Go to verified numbers page
   - Verify if not already done

4. **Still not working?** → Check carrier compatibility
   - Try sending to a different number (different carrier)
   - Consider upgrading from trial account

## 7. Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 21608 | Unverified number (trial) | Verify number in console |
| 21211 | Invalid phone number | Check E.164 format |
| 21606 | From number not valid | Check Twilio phone config |
| 30006 | Landline/unreachable carrier | Try different number/carrier |
| 30007 | Message filtered | Carrier blocked message |
| 30008 | Unknown destination | Invalid phone number |

## Additional Resources

- [Twilio Error Codes](https://www.twilio.com/docs/api/errors)
- [SMS Geographic Permissions](https://www.twilio.com/docs/sms/tutorials/geo-permissions-sms-api)
- [Debugging Message Delivery](https://www.twilio.com/docs/sms/tutorials/debugging-delivery-issues)
