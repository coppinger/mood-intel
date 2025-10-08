# WhatsApp Integration - What Changed

This document explains the changes made to support WhatsApp alongside SMS.

## 📋 Summary of Changes

### ✅ What's New
- **Dual-channel support**: Both SMS and WhatsApp work through the same webhook
- **Automatic detection**: System detects channel from phone number format
- **No new credentials needed**: Uses existing Twilio account
- **Backwards compatible**: All existing SMS functionality still works

### 🔧 Modified Files

#### 1. `backend/pb_hooks/sms.pb.js`
**What changed**: Added channel detection and formatting logic (inlined)

**Channel detection logic** (inlined due to PocketBase scoping):
```javascript
// Detect channel
const channel = from && from.startsWith('whatsapp:') ? 'whatsapp' : 'sms';

// Clean phone number
const cleanFrom = from ? from.replace(/^(whatsapp:|sms:)/, '') : from;

// Format for Twilio
const formatted = channel === 'whatsapp' ? `whatsapp:${cleanPhone}` : cleanPhone;
```

**Important**: Helper functions are **inlined** in each callback because PocketBase executes each `routerAdd` callback in an isolated context where global functions aren't accessible.

**Updated endpoints**:
- `/api/sms/webhook`: Now handles both SMS and WhatsApp
- `/api/sms/send-prompt`: Accepts `channel` parameter (defaults to 'sms')
- `/api/sms/test-inbound`: Accepts `channel` parameter for testing

**Enhanced logging**:
- All logs now show `[SMS]` or `[WHATSAPP]` prefix
- Easier debugging and monitoring

#### 2. `.env.example`
**What changed**: Added comments explaining WhatsApp support

**No new variables needed!** Your existing Twilio credentials work for both channels:
```bash
TWILIO_ACCOUNT_SID=your_sid      # Works for SMS + WhatsApp
TWILIO_AUTH_TOKEN=your_token     # Works for SMS + WhatsApp
TWILIO_PHONE_NUMBER=+1234567890  # Works for SMS + WhatsApp
```

#### 3. `README.md`
**What changed**: Added comprehensive WhatsApp setup instructions

**New sections**:
- WhatsApp sandbox setup (quick testing)
- WhatsApp production setup
- Channel comparison and cost estimates
- WhatsApp-specific troubleshooting

#### 4. `scripts/test-whatsapp-integration.sh` (New)
**What it does**: Test script for both SMS and WhatsApp channels

**Usage**:
```bash
chmod +x scripts/test-whatsapp-integration.sh
./scripts/test-whatsapp-integration.sh http://localhost:8080
```

#### 5. `docs/WHATSAPP_SETUP.md` (New)
**What it does**: Step-by-step WhatsApp setup guide

## 🚀 Deployment Guide

### Option 1: Quick Deploy (No Downtime)

Since the changes are backwards compatible, you can deploy immediately:

```bash
cd backend
flyctl deploy
```

That's it! Your SMS functionality continues working, and WhatsApp is now available.

### Option 2: Test Locally First

```bash
# 1. Pull the latest changes
cd /home/charlie/projects/mood-intel

# 2. Test locally
cd backend
./pocketbase serve --http=0.0.0.0:8080

# 3. In another terminal, run tests
cd /home/charlie/projects/mood-intel
./scripts/test-whatsapp-integration.sh http://localhost:8080

# 4. Check logs for [SMS] and [WHATSAPP] prefixes

# 5. Deploy when satisfied
flyctl deploy
```

## 🔍 How Channel Detection Works

### SMS Messages (Legacy)
Twilio sends:
```
From: +1234567890
Body: 4, M, working from home, continue coding
```

System detects: `channel = 'sms'`

### WhatsApp Messages (New)
Twilio sends:
```
From: whatsapp:+1234567890
Body: 4, M, working from home, continue coding
```

System detects: `channel = 'whatsapp'`

### Processing (Identical)
Both messages are processed exactly the same way:
1. Extract `From` and `Body` from webhook
2. Detect channel from `From` format
3. Process with Claude AI
4. Save to database
5. Send confirmation via same channel

## 📊 API Changes

### `/api/sms/webhook` (Updated)
**Before**: Only SMS
**Now**: SMS + WhatsApp (auto-detected)

**No breaking changes** - webhook URL stays the same!

### `/api/sms/send-prompt` (Updated)
**Before**:
```json
{
  "phone_number": "+1234567890"
}
```

**Now** (backwards compatible):
```json
{
  "phone_number": "+1234567890",
  "channel": "whatsapp"  // Optional, defaults to "sms"
}
```

### `/api/sms/test-inbound` (Updated)
**Before**:
```json
{
  "message": "test",
  "from": "+1234567890"
}
```

**Now** (backwards compatible):
```json
{
  "message": "test",
  "from": "+1234567890",
  "channel": "whatsapp"  // Optional, defaults to "sms"
}
```

## 🧪 Testing Checklist

### Pre-Deployment Tests (Local)

- [ ] Test SMS webhook:
  ```bash
  curl -X POST http://localhost:8080/api/sms/webhook \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "From=%2B1234567890&Body=test"
  ```
  Expected log: `[SMS] Received message from +1234567890`

- [ ] Test WhatsApp webhook:
  ```bash
  curl -X POST http://localhost:8080/api/sms/webhook \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "From=whatsapp%3A%2B1234567890&Body=test"
  ```
  Expected log: `[WHATSAPP] Received message from +1234567890`

- [ ] Verify database entries are created
- [ ] Check Claude AI processing works for both channels

### Post-Deployment Tests (Production)

- [ ] Deploy to Fly.io: `flyctl deploy`
- [ ] Check logs: `flyctl logs -a mood-intel-backend`
- [ ] Test SMS still works (send test SMS to your Twilio number)
- [ ] Configure WhatsApp sandbox (see `WHATSAPP_SETUP.md`)
- [ ] Join sandbox and send test WhatsApp message
- [ ] Verify both channels appear in dashboard

## 🔄 Migration Path for Existing Users

### If You're Currently Using SMS

**Good news**: Nothing breaks! Continue using SMS as before.

**To add WhatsApp**:
1. Set up Twilio WhatsApp Sandbox (see `WHATSAPP_SETUP.md`)
2. Join the sandbox from your phone
3. Start sending check-ins via WhatsApp
4. Both SMS and WhatsApp work simultaneously!

### If You Want WhatsApp-Only

1. Set up WhatsApp (see `WHATSAPP_SETUP.md`)
2. Test thoroughly
3. Stop using SMS webhook in Twilio console (optional)
4. Keep SMS as fallback (recommended!)

## 📝 Code Architecture

### Before (SMS-only)
```
Twilio SMS → Webhook → Process → Save → Confirm (SMS)
```

### Now (Multi-channel)
```
Twilio SMS/WhatsApp → Webhook → Detect Channel → Process → Save → Confirm (same channel)
                                      ↓
                                 [SMS/WHATSAPP]
```

### Key Design Principles

1. **Channel-agnostic processing**: Claude AI doesn't care about the channel
2. **Automatic routing**: Confirmations use the same channel as input
3. **No configuration needed**: Detection is automatic
4. **Backwards compatible**: SMS continues to work unchanged

## ⚠️ Important Notes

### No Breaking Changes
- All existing SMS functionality works exactly as before
- No database schema changes required
- No new environment variables needed
- Existing webhook URL continues to work

### New Features Are Optional
- WhatsApp support is optional
- Can use SMS, WhatsApp, or both
- Easy to test with sandbox before committing

### Logging Improvements
- Better debugging with channel prefixes
- Easier to track which messages came from which channel
- Helpful for monitoring and troubleshooting

## 🎯 Next Steps

1. **Deploy the changes**
   ```bash
   cd backend
   flyctl deploy
   ```

2. **Set up WhatsApp Sandbox** (5 minutes)
   - Follow `docs/WHATSAPP_SETUP.md`

3. **Test it out**
   - Send a WhatsApp message to the sandbox
   - Verify it appears in your dashboard

4. **Decide on production**
   - Sandbox is fine for personal use
   - Apply for production WhatsApp if needed

## 🆘 Rollback Plan

If something goes wrong, you can easily roll back:

```bash
cd backend
git checkout HEAD~1  # Go back one commit
flyctl deploy       # Deploy previous version
```

Your SMS functionality will continue working as before.

## 📞 Support

If you run into issues:

1. Check logs: `flyctl logs -a mood-intel-backend`
2. Look for `[SMS]` or `[WHATSAPP]` prefixes
3. Verify webhook URL in Twilio console
4. Review `docs/WHATSAPP_SETUP.md` troubleshooting section

Happy messaging! 📱✉️
