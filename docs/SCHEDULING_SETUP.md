# Automated Message Scheduling Setup

This guide shows you how to set up automated hourly mood check-in prompts using GitHub Actions (recommended) or other scheduling methods.

## Table of Contents

- [GitHub Actions Setup (Recommended)](#github-actions-setup-recommended)
- [Alternative: Local Cron Job](#alternative-local-cron-job)
- [Alternative: Fly.io Machines](#alternative-flyio-machines)
- [Timezone Configuration](#timezone-configuration)
- [Testing Your Setup](#testing-your-setup)
- [Troubleshooting](#troubleshooting)

---

## GitHub Actions Setup (Recommended)

**Why GitHub Actions?**
- ✅ Free (2,000 minutes/month on free plan)
- ✅ Cloud-based (no server needed)
- ✅ Easy to configure and test
- ✅ Automatic retries on failure
- ✅ View logs for each run

### Step 1: Get Your PocketBase Admin Token

You need an admin token to authenticate API requests. Here's how to get it:

#### Option A: Via API

```bash
curl -X POST https://mood-intel-backend.fly.dev/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"your-admin@email.com","password":"your-admin-password"}'
```

The response will include a `token` field - copy this value.

#### Option B: Via PocketBase Admin UI

1. Open your PocketBase admin panel: `https://mood-intel-backend.fly.dev/_/`
2. Open browser DevTools (F12)
3. Go to Application/Storage → Local Storage → your backend URL
4. Look for `pocketbase_auth` → copy the `token` value

**Important:** Admin tokens expire after a period of time. If your scheduled prompts stop working, you may need to regenerate the token.

### Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `BACKEND_URL` | Your PocketBase backend URL | `https://mood-intel-backend.fly.dev` |
| `ADMIN_TOKEN` | The token from Step 1 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `PHONE_NUMBER` | Your phone number (E.164 format) | `+64211234567` |

**Note:** Do NOT include `whatsapp:` or `sms:` prefix in the phone number. The workflow will add the correct prefix based on the channel setting.

### Step 3: Enable GitHub Actions

The workflow file is already created at `.github/workflows/send-prompts.yml`.

1. Push your changes to GitHub:
   ```bash
   git add .github/workflows/send-prompts.yml
   git commit -m "Add automated scheduling for mood prompts"
   git push
   ```

2. Go to **Actions** tab in your GitHub repo
3. You should see the "Send Mood Check-In Prompts" workflow
4. If workflows are disabled, click "I understand my workflows, go ahead and enable them"

### Step 4: Test the Workflow Manually

Before relying on the scheduled runs, test it manually:

1. Go to **Actions** tab → **Send Mood Check-In Prompts**
2. Click **Run workflow**
3. Select:
   - **Branch:** `master` (or your default branch)
   - **Channel:** `whatsapp` or `sms`
   - **Phone number:** (optional, leave empty to use the secret)
4. Click **Run workflow**

Wait 10-30 seconds, then you should receive a message on your phone!

5. Check the workflow run:
   - Click on the workflow run to see logs
   - Verify the message was sent successfully
   - Look for "✓ Prompt sent successfully"

### Step 5: Verify Scheduled Runs

The workflow is configured to run every hour from 8am-10pm NZDT (UTC+13).

- **First scheduled run:** Will be at the next hour boundary
- **View scheduled runs:** Actions tab → Filter by "workflow:Send Mood Check-In Prompts"
- **View logs:** Click on any run to see details

**Important:** GitHub Actions cron schedules may be delayed by up to 15 minutes during peak times.

---

## Timezone Configuration

The workflow runs on GitHub's servers in **UTC timezone**. You need to adjust the cron schedule to match your local timezone.

### Current Configuration (NZDT - UTC+13)

The default workflow is configured for New Zealand Daylight Time (UTC+13):

```yaml
- cron: '0 19-23 * * *'  # 8am-12pm NZDT
- cron: '0 0-9 * * *'     # 1pm-10pm NZDT
```

### Adjusting for Your Timezone

1. **Find your UTC offset:**
   - NZDT (Daylight): UTC+13
   - NZST (Standard): UTC+12
   - AEST (Sydney): UTC+10
   - PST (Los Angeles): UTC-8
   - EST (New York): UTC-5

2. **Calculate UTC hours:**
   - For UTC+13: 8am local = 19:00 UTC (previous day)
   - For UTC-8: 8am local = 16:00 UTC (same day)

3. **Update cron schedule:**

   Edit `.github/workflows/send-prompts.yml`:

   ```yaml
   schedule:
     # Example for PST (UTC-8): 8am-10pm PST = 16:00-06:00 UTC
     - cron: '0 16-23 * * *'  # 8am-3pm PST
     - cron: '0 0-6 * * *'    # 4pm-10pm PST
   ```

4. **Cron syntax reference:**
   ```
   ┌───────────── minute (0-59)
   │ ┌───────────── hour (0-23)
   │ │ ┌───────────── day of month (1-31)
   │ │ │ ┌───────────── month (1-12)
   │ │ │ │ ┌───────────── day of week (0-6, Sunday-Saturday)
   │ │ │ │ │
   0 * * * *
   ```

### Useful Tools

- [Crontab Guru](https://crontab.guru/) - Test cron expressions
- [Time Zone Converter](https://www.timeanddate.com/worldclock/converter.html) - Convert between timezones

---

## Alternative: Local Cron Job

If you have a server or machine that's always on (Raspberry Pi, home server, etc.):

### Setup

1. **Create send-prompt script:**

   ```bash
   nano ~/send-mood-prompt.sh
   ```

   Add this content:

   ```bash
   #!/bin/bash

   BACKEND_URL="https://mood-intel-backend.fly.dev"
   ADMIN_TOKEN="your_admin_token_here"
   PHONE_NUMBER="+64211234567"
   CHANNEL="whatsapp"  # or "sms"

   curl -X POST "$BACKEND_URL/api/sms/send-prompt" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"phone_number\": \"$PHONE_NUMBER\", \"channel\": \"$CHANNEL\"}"
   ```

2. **Make it executable:**

   ```bash
   chmod +x ~/send-mood-prompt.sh
   ```

3. **Test it:**

   ```bash
   ~/send-mood-prompt.sh
   ```

4. **Add to crontab:**

   ```bash
   crontab -e
   ```

   Add this line for hourly prompts from 8am-10pm:

   ```cron
   0 8-22 * * * /home/youruser/send-mood-prompt.sh >> /home/youruser/mood-prompt.log 2>&1
   ```

5. **Verify cron job:**

   ```bash
   crontab -l
   tail -f ~/mood-prompt.log
   ```

---

## Alternative: Fly.io Machines

⚠️ **Note:** This requires a paid Fly.io plan with Machines API access.

### Setup

1. **Create a cron machine:**

   ```bash
   cd backend
   flyctl machines create \
     --app mood-intel-backend \
     --schedule "0 8-22 * * *" \
     --entrypoint "/bin/sh" \
     --cmd "-c 'curl -X POST http://localhost:8080/api/sms/send-prompt -H \"Authorization: Bearer \$ADMIN_TOKEN\"'"
   ```

2. **Set admin token as secret:**

   ```bash
   flyctl secrets set ADMIN_TOKEN="your_token_here" -a mood-intel-backend
   ```

---

## Testing Your Setup

### Manual Test via curl

Test the endpoint directly to verify it works:

```bash
# Replace with your actual values
BACKEND_URL="https://mood-intel-backend.fly.dev"
ADMIN_TOKEN="your_token"
PHONE_NUMBER="+64211234567"

# Test SMS
curl -X POST "$BACKEND_URL/api/sms/send-prompt" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\": \"$PHONE_NUMBER\", \"channel\": \"sms\"}"

# Test WhatsApp
curl -X POST "$BACKEND_URL/api/sms/send-prompt" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phone_number\": \"$PHONE_NUMBER\", \"channel\": \"whatsapp\"}"
```

Expected response:

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

### Verify Message Delivery

1. **Check your phone:** You should receive the message within 1-2 minutes
2. **Check backend logs:**
   ```bash
   flyctl logs -a mood-intel-backend
   ```
   Look for `[SMS]` or `[WHATSAPP]` log entries

3. **Check Twilio console:**
   - Go to [Twilio Console → Monitor → Logs → Messaging](https://console.twilio.com/us1/monitor/logs/sms)
   - Verify message status (queued → sent → delivered)

---

## Troubleshooting

### GitHub Actions Not Running

**Issue:** Workflow doesn't appear in Actions tab

**Solution:**
- Make sure you pushed the workflow file to GitHub
- Check that workflows are enabled in repo settings
- Verify the file is in `.github/workflows/` directory

---

### "Invalid Token" Error

**Issue:** `401 Unauthorized` or "Invalid token"

**Cause:** Admin token expired or incorrect

**Solution:**
1. Re-generate admin token (see Step 1)
2. Update GitHub secret `ADMIN_TOKEN`
3. Run workflow manually to test

---

### "Phone Number Not Verified" Error

**Issue:** Twilio error 21608

**Cause:** Trial account requires verified phone numbers

**Solution:**
1. Verify your phone number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. **Or** upgrade to a paid Twilio account

---

### Messages Not Delivered (WhatsApp)

**Issue:** Message sent but not received

**Possible causes:**
1. **Sandbox not joined:** Send `join <code>` to Twilio WhatsApp number
2. **Sandbox expired:** Reconnect by sending `join <code>` again (expires after 72 hours of inactivity)
3. **Number not approved:** For production WhatsApp, verify number is approved in Twilio

**Solution:**
- Check Twilio console logs for delivery status
- Re-join WhatsApp sandbox if needed
- Check backend logs for error messages

---

### Scheduled Runs Delayed

**Issue:** GitHub Actions runs 5-15 minutes late

**Cause:** GitHub Actions cron can be delayed during peak times

**Solution:**
- This is normal GitHub behavior
- If timing is critical, consider local cron job or Fly.io Machines
- GitHub does not guarantee exact scheduling

---

### Wrong Timezone

**Issue:** Prompts arrive at wrong time of day

**Cause:** Cron schedule is in UTC, not your local timezone

**Solution:**
- See [Timezone Configuration](#timezone-configuration) section
- Calculate correct UTC offset
- Update cron schedule in workflow file
- Remember to account for daylight saving time changes

---

## Best Practices

1. **Test before automating:**
   - Always test manually first
   - Verify messages are received
   - Check logs for errors

2. **Monitor regularly:**
   - Check GitHub Actions tab weekly
   - Set up email notifications for failed runs
   - Review Twilio usage/balance

3. **Token security:**
   - Never commit tokens to git
   - Use GitHub secrets for sensitive data
   - Rotate tokens periodically

4. **WhatsApp vs SMS:**
   - WhatsApp is cheaper for high volume
   - WhatsApp sandbox good for testing
   - SMS works everywhere (no setup needed)

5. **Timezone changes:**
   - Update cron schedule when DST changes
   - Or use a timezone-aware scheduling service

---

## Next Steps

Once scheduling is working:

1. **Customize prompt message:**
   - Edit `backend/pb_hooks/sms.pb.js`
   - Update the `message` variable in `/api/sms/send-prompt`

2. **Add multiple phone numbers:**
   - Modify workflow to loop through multiple numbers
   - Or create separate workflows per person

3. **Dynamic scheduling:**
   - Create a PocketBase collection for schedule preferences
   - Build an API to query/update schedule
   - Use workflow_dispatch to trigger from external systems

4. **Notifications:**
   - Set up GitHub Actions notifications in repo settings
   - Get email alerts when workflow fails

---

## Support

If you run into issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend logs: `flyctl logs -a mood-intel-backend`
3. Check Twilio console for delivery issues
4. Open an issue on GitHub with logs and error messages
