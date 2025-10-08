# Testing Guide: Scheduled Prompts

Quick reference for testing your automated mood check-in prompts.

## Prerequisites

Before testing, you need:

1. ✅ Backend deployed on Fly.io
2. ✅ Twilio account configured (SMS or WhatsApp sandbox)
3. ✅ Phone number verified (for trial accounts)
4. ✅ PocketBase admin token

---

## Step 1: Get Admin Token

```bash
# Replace with your actual credentials
curl -X POST https://mood-intel-backend.fly.dev/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"your-admin@email.com","password":"your-password"}'
```

**Save the token** - you'll use it for all tests below.

---

## Step 2: Test Send-Prompt Endpoint

### Option A: Using the Test Script (Recommended)

```bash
# Set environment variables
export BACKEND_URL="https://mood-intel-backend.fly.dev"
export ADMIN_TOKEN="your_token_here"
export PHONE_NUMBER="+64211234567"

# Test WhatsApp
./scripts/schedule-prompts.sh whatsapp

# Test SMS
./scripts/schedule-prompts.sh sms
```

### Option B: Using curl Directly

```bash
# Test WhatsApp
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+64211234567", "channel": "whatsapp"}'

# Test SMS
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+64211234567", "channel": "sms"}'
```

**Expected response:**

```json
{
  "success": true,
  "message": "Prompt sent",
  "debug": {
    "status": 201,
    "to": "+64211234567",
    "messageSid": "SM...",
    "messageStatus": "queued"
  }
}
```

**Check your phone:** You should receive a message within 1-2 minutes.

---

## Step 3: Test GitHub Actions Workflow

### Manual Test (Before Scheduling)

1. **Push the workflow to GitHub:**

   ```bash
   git add .github/workflows/send-prompts.yml
   git commit -m "Add automated scheduling"
   git push
   ```

2. **Set up GitHub secrets:**

   Go to **Settings** → **Secrets and variables** → **Actions**

   Add these secrets:
   - `BACKEND_URL` = `https://mood-intel-backend.fly.dev`
   - `ADMIN_TOKEN` = (token from Step 1)
   - `PHONE_NUMBER` = `+64211234567`

3. **Run workflow manually:**

   - Go to **Actions** tab in GitHub
   - Click **Send Mood Check-In Prompts**
   - Click **Run workflow**
   - Select branch: `master`
   - Select channel: `whatsapp`
   - Click **Run workflow**

4. **Check results:**

   - Wait 10-30 seconds
   - Click on the workflow run
   - Verify it shows "✓ Prompt sent successfully"
   - Check your phone for the message

### Verify Scheduled Runs

After manual test succeeds:

1. **Wait for next scheduled hour** (runs every hour 8am-10pm)
2. **Check Actions tab** for automatic runs
3. **Monitor first few runs** to ensure they work

---

## Step 4: Test Inbound Messages

Test that replies work correctly:

```bash
# Test processing a WhatsApp message
curl -X POST https://mood-intel-backend.fly.dev/api/sms/test-inbound \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "5, H, testing automation, review logs",
    "from": "+64211234567",
    "channel": "whatsapp"
  }'
```

**Expected:**
- Entry created in database
- Response shows parsed data (mood, energy, etc.)

**Verify in dashboard:**
- Open `https://your-frontend.fly.dev`
- Log in
- Check today's entries

---

## Step 5: End-to-End Test

Full workflow test:

1. **Send a prompt** (using script or GitHub Actions)
2. **Reply on your phone** with something like: `4, M, testing, continue coding`
3. **Check dashboard** - entry should appear within 30 seconds
4. **Verify parsed data** - mood=4, energy=M, doing="testing"

---

## Troubleshooting Quick Reference

### Message Not Received

**Check backend logs:**
```bash
flyctl logs -a mood-intel-backend
```

Look for:
- `[WHATSAPP]` or `[SMS]` entries
- Twilio API errors
- HTTP status codes

**Check Twilio console:**
- Go to [Twilio Console → Logs](https://console.twilio.com/us1/monitor/logs/sms)
- Check message status
- Look for delivery errors

### Authentication Errors

**401 Unauthorized:**
- Token expired → regenerate token (Step 1)
- Token incorrect → check you copied full token
- Update GitHub secrets if using Actions

**500 Internal Server Error:**
- Check Twilio credentials in Fly.io secrets
- Verify phone number format (+country code)
- Check Twilio account balance

### WhatsApp Specific

**Sandbox not working:**
```
1. Open WhatsApp on your phone
2. Send message to: +1 415 523 8886 (Twilio sandbox number)
3. Message content: join <your-sandbox-code>
4. Wait for confirmation
5. Try sending prompt again
```

**Sandbox expired (after 72 hours inactivity):**
- Re-join by sending `join <code>` again

---

## Monitoring Checklist

Once scheduling is active, monitor:

- [ ] **Week 1:** Check GitHub Actions runs daily
- [ ] **Week 2:** Check logs for any errors
- [ ] **Monthly:** Verify Twilio balance/usage
- [ ] **When DST changes:** Update cron schedule if needed

---

## Testing Checklist

Before going live:

- [ ] Admin token obtained and saved securely
- [ ] Manual curl test successful (WhatsApp or SMS)
- [ ] GitHub secrets configured
- [ ] GitHub Actions manual run successful
- [ ] Phone receives messages within 2 minutes
- [ ] Reply processing works (end-to-end test)
- [ ] Dashboard shows entries correctly
- [ ] Backend logs show no errors
- [ ] Twilio console shows "delivered" status

---

## Common Test Scenarios

### Test 1: Basic Send (WhatsApp)
```bash
export BACKEND_URL="https://mood-intel-backend.fly.dev"
export ADMIN_TOKEN="your_token"
export PHONE_NUMBER="+64211234567"

./scripts/schedule-prompts.sh whatsapp
# → Check phone for message
```

### Test 2: GitHub Actions Dry Run
```bash
# Test locally first
curl -X POST "$BACKEND_URL/api/sms/send-prompt" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel": "whatsapp"}'
# → If successful, GitHub Actions should work
```

### Test 3: Timezone Verification
```bash
# Send a test at current time
./scripts/schedule-prompts.sh whatsapp

# Note the time received on phone
# Compare with your local time
# Adjust cron schedule if needed (see SCHEDULING_SETUP.md)
```

### Test 4: Token Expiry Handling
```bash
# Use an old/invalid token
ADMIN_TOKEN="invalid_token" ./scripts/schedule-prompts.sh

# Should show clear error message
# → "401 Unauthorized" means token validation is working
```

---

## Next Steps After Testing

Once all tests pass:

1. **Enable automated scheduling:**
   - GitHub Actions will run automatically
   - Monitor first 2-3 days

2. **Set up notifications:**
   - GitHub Settings → Notifications
   - Enable email for failed Actions

3. **Document your setup:**
   - Save admin token securely (password manager)
   - Note timezone configuration
   - Record any customizations

4. **Regular maintenance:**
   - Rotate admin token monthly
   - Monitor Twilio usage
   - Update cron schedule for DST

---

## Quick Reference: Environment Variables

```bash
# For local testing
export BACKEND_URL="https://mood-intel-backend.fly.dev"
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export PHONE_NUMBER="+64211234567"

# Test WhatsApp
./scripts/schedule-prompts.sh whatsapp

# Test SMS
./scripts/schedule-prompts.sh sms
```

## Quick Reference: GitHub Secrets

| Secret Name | Value |
|------------|-------|
| `BACKEND_URL` | `https://mood-intel-backend.fly.dev` |
| `ADMIN_TOKEN` | (from auth API) |
| `PHONE_NUMBER` | `+64211234567` |

---

## Support

For detailed setup instructions, see:
- [SCHEDULING_SETUP.md](./SCHEDULING_SETUP.md) - Complete setup guide
- [README.md](../README.md) - Project overview

For issues:
- Check backend logs: `flyctl logs -a mood-intel-backend`
- Check Twilio console for delivery status
- Review GitHub Actions logs in repo
