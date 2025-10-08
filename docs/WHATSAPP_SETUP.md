# WhatsApp Setup Guide

This guide will help you set up WhatsApp integration for Mood Intel in under 10 minutes.

## 🚀 Quick Start (Testing with Sandbox)

### Step 1: Configure Twilio WhatsApp Sandbox (5 minutes)

1. **Open Twilio Console**
   - Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

2. **Access Sandbox Settings**
   - Click the **"Sandbox settings"** button

3. **Configure Webhook**
   - Set **"When a message comes in"** to:
     ```
     https://mood-intel-backend.fly.dev/api/sms/webhook
     ```
   - Set HTTP method to: **POST**
   - Click **Save**

### Step 2: Join the Sandbox (2 minutes)

1. **Find Your Sandbox Number**
   - Look for the WhatsApp number shown in the Twilio Console (usually +14155238886)
   - Note your unique join code (shown as "join <code>")

2. **Join via WhatsApp**
   - Open WhatsApp on your phone
   - Send a message to the sandbox number: `join <your-code>`
   - You'll receive a confirmation message

### Step 3: Test It! (1 minute)

**Send a test check-in:**
```
4, H, testing WhatsApp integration, will deploy soon
```

You should receive a confirmation: "✓ Check-in recorded. Thanks!"

**Or trigger a prompt from the backend:**
```bash
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "channel": "whatsapp"}'
```

## 🎯 How It Works

### Channel Detection
The system **automatically detects** which channel you're using:

- **SMS**: `From: +1234567890`
- **WhatsApp**: `From: whatsapp:+1234567890`

No configuration needed - just send messages and the system handles everything!

### What Changed?

Your existing setup now supports **both SMS and WhatsApp** using the **same webhook endpoint**:
```
https://mood-intel-backend.fly.dev/api/sms/webhook
```

### Backend Improvements

1. **Channel-agnostic processing**: Claude AI processes both SMS and WhatsApp identically
2. **Automatic routing**: Confirmation messages are sent via the same channel as the incoming message
3. **Enhanced logging**: Logs now show `[SMS]` or `[WHATSAPP]` prefixes for easy debugging

## 📱 Production Setup (When Ready)

### Step 1: Apply for WhatsApp Business Access

1. Go to: https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders
2. Click **"New WhatsApp Sender"**
3. Follow the approval process (typically 2-3 business days)
4. Choose your business profile and submit required documentation

### Step 2: Configure Message Templates

WhatsApp requires pre-approved templates for business-initiated messages:

**Template Name**: `mood_checkin_prompt`

**Template Content**:
```
Quick check-in: Mood (1-5), Energy (L/M/H), Doing, Next hour?
```

**Category**: Utility

**Language**: English

### Step 3: Update Configuration

Once approved, update your webhook URL in the production WhatsApp sender settings (same URL as sandbox).

## 🔧 Testing & Debugging

### Local Testing (Without Twilio)

Test the webhook locally to verify channel detection:

```bash
# Test WhatsApp message
curl -X POST http://localhost:8080/api/sms/test-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "message": "5, H, working on project, continue coding",
    "from": "+64212345678",
    "channel": "whatsapp"
  }'

# Test SMS message
curl -X POST http://localhost:8080/api/sms/test-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "message": "4, M, taking a break, back to work",
    "from": "+64212345678",
    "channel": "sms"
  }'
```

### View Logs

**Deployed (Fly.io):**
```bash
flyctl logs -a mood-intel-backend
```

**Look for these log patterns:**
```
[WHATSAPP] Received message from +1234567890: 4, M, testing, coding
[WHATSAPP] Confirmation sent to +1234567890
```

**Local (PocketBase):**
```bash
cd backend
./pocketbase serve --http=0.0.0.0:8080
# Logs will appear in terminal
```

### Common Issues

#### 1. Sandbox connection expired
**Symptom**: Messages not being received after 72 hours

**Solution**: Re-join the sandbox by sending `join <code>` again

#### 2. Wrong webhook URL
**Symptom**: Messages sent but webhook not triggered

**Solution**:
- Verify webhook URL in Twilio Sandbox Settings
- Should be: `https://your-backend.fly.dev/api/sms/webhook`
- HTTP method: POST

#### 3. Channel not detected
**Symptom**: Logs don't show `[WHATSAPP]` prefix

**Solution**:
- Check that you're sending from a WhatsApp number
- Verify Twilio is adding the `whatsapp:` prefix in the webhook payload
- Check Twilio webhook logs in console

## 💰 Cost Comparison

### Sandbox (Testing)
- **FREE** - No charges for sandbox testing
- **Limitation**: Only works for numbers that joined your sandbox

### Production WhatsApp
- **~$0.005-0.01** per conversation (24-hour window)
- **User-initiated conversations**: Often FREE (check regional pricing)
- **Much cheaper than SMS** for frequent check-ins

### Example Cost Calculation
If you do 15 check-ins per day (one per hour from 8am-10pm):

**SMS**:
- 15 messages/day × 30 days = 450 messages/month
- Cost: ~$9-15/month (at $0.02-0.03 per SMS)

**WhatsApp**:
- Most check-ins are user-initiated (replying to prompts) = FREE
- Business-initiated prompts: ~15/day = ~450 conversations/month
- Cost: ~$2.25-4.50/month (at $0.005-0.01 per conversation)

**Savings: ~$5-10/month with WhatsApp!**

## 🎉 Next Steps

1. ✅ **Test with sandbox** (you're probably already doing this!)
2. 📊 **Monitor usage** in Twilio console
3. 🚀 **Apply for production** when ready (optional - sandbox works fine for personal use)
4. 📱 **Enjoy reliable NZ delivery** without SMS carrier issues!

## 🆘 Need Help?

- **Twilio WhatsApp Docs**: https://www.twilio.com/docs/whatsapp
- **Backend logs**: `flyctl logs -a mood-intel-backend`
- **Test script**: `./scripts/test-whatsapp-integration.sh`
- **Check Twilio console**: https://console.twilio.com for delivery status

## 🔒 Important Notes

- **Sandbox limitations**:
  - Only works for numbers that joined your sandbox
  - Sandbox connections expire after 72 hours of inactivity
  - "Sandbox" appears in message metadata
  - Use for testing only

- **Production benefits**:
  - Your own WhatsApp Business number
  - No sandbox limitations
  - Professional branding
  - Approved message templates

Happy tracking! 🎯
