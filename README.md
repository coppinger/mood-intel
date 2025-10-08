# Mood Intel

Personal mood and energy tracking system via SMS and WhatsApp. Text-based check-ins processed by Claude AI, stored in PocketBase, and displayed on a React dashboard.

## Features

- **SMS & WhatsApp Check-ins**: Receive hourly prompts and reply with your mood, energy level, and what you're doing
- **AI Processing**: Claude API extracts structured data and generates insights from your responses
- **Daily View**: Timeline of entries with mood/energy charts
- **Weekly View**: Heatmap visualization showing patterns across the week
- **Secure**: Password-protected dashboard with single-user authentication
- **Multi-Channel**: Works with both SMS and WhatsApp using the same webhook

## Tech Stack

- **Backend**: PocketBase (self-hosted database and API)
- **Messaging**: Twilio (SMS + WhatsApp)
- **AI**: Claude API (Sonnet 4.5)
- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Deployment**: Fly.io

## Project Structure

```
mood-intel/
├── backend/
│   ├── Dockerfile
│   ├── fly.toml
│   ├── pb_hooks/
│   │   ├── sms.pb.js          # SMS webhook handler
│   │   └── claude.pb.js        # Claude API integration
│   └── pb_migrations/          # Database schema
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DailyView.jsx
│   │   │   └── WeeklyView.jsx
│   │   ├── lib/
│   │   │   └── pocketbase.js
│   │   └── App.jsx
│   ├── Dockerfile
│   └── fly.toml
└── .env.example
```

## Setup Instructions

### Prerequisites

- [Fly.io account](https://fly.io) (for deployment)
- [Twilio account](https://www.twilio.com) (for SMS)
- [Anthropic API key](https://console.anthropic.com) (for Claude)
- [Node.js](https://nodejs.org) 20+ (for local development)
- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)

### 1. Clone and Configure

```bash
git clone <your-repo-url>
cd mood-intel
cp .env.example .env
# Edit .env with your actual credentials
```

### 2. Deploy Backend (PocketBase)

```bash
cd backend

# Login to Fly.io
flyctl auth login

# Create app
flyctl apps create mood-intel-backend

# Create persistent volume for database
flyctl volumes create pb_data --size 1 --region sjc

# Generate Twilio auth header (Base64 encode "SID:TOKEN")
echo -n "your_sid:your_token" | base64
# Example output: QUMxMjM0NTY3ODkwOmF1dGhfdG9rZW5faGVyZQ==

# Set environment variables
flyctl secrets set CLAUDE_API_KEY="your_key"
flyctl secrets set TWILIO_ACCOUNT_SID="your_sid"
flyctl secrets set TWILIO_AUTH_HEADER="Basic QUMxMjM0NTY3ODkwOmF1dGhfdG9rZW5faGVyZQ=="
flyctl secrets set TWILIO_PHONE_NUMBER="+1234567890"
flyctl secrets set YOUR_PHONE_NUMBER="+1234567890"

# Deploy
flyctl deploy

# Get your backend URL
flyctl info
# Note the hostname (e.g., mood-intel-backend.fly.dev)
```

### 3. Create PocketBase Admin User

```bash
# Open PocketBase admin UI
open https://mood-intel-backend.fly.dev/_/

# Create an admin account when prompted
# Then create a regular user in the "users" collection for dashboard login
```

### 4. Configure Twilio Webhook

#### For SMS:
1. Go to your [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers → Your active number
3. Under "Messaging", set webhook URL to:
   ```
   https://mood-intel-backend.fly.dev/api/sms/webhook
   ```
4. Set HTTP method to `POST`
5. Save

#### For WhatsApp (Recommended):

**Option A: Quick Testing with WhatsApp Sandbox (5 minutes)**

Perfect for testing before going to production:

1. Go to [Twilio Console → Messaging → Try it out → Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Click **Sandbox settings**
3. Set the webhook URL to:
   ```
   https://mood-intel-backend.fly.dev/api/sms/webhook
   ```
4. Set HTTP method to `POST`
5. Save
6. On your phone, open WhatsApp and send this message to the Twilio sandbox number shown:
   ```
   join <your-sandbox-code>
   ```
7. You'll receive a confirmation - now you can send test check-ins!

**Limitations of Sandbox:**
- Only works for people who've joined your sandbox
- Shared Twilio number (can't customize)
- "Sandbox" appears in message preview
- Testing only (don't use for production)

**Option B: Production WhatsApp Setup**

For long-term use with your own WhatsApp Business number:

1. Go to [Twilio Console → Messaging → Senders → WhatsApp senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)
2. Click **New WhatsApp Sender**
3. Follow Twilio's approval process (usually 2-3 days)
4. Once approved, configure webhook URL (same as sandbox above)
5. Register message templates for your check-in prompts

**Why WhatsApp?**
- ✅ More reliable international delivery
- ✅ Free messages (after Twilio/WhatsApp fees)
- ✅ Better multimedia support
- ✅ No SMS carrier issues
- ✅ Works great for NZ numbers!

### 5. Deploy Frontend

```bash
cd ../frontend

# Create .env file
echo "VITE_POCKETBASE_URL=https://mood-intel-backend.fly.dev" > .env

# Create app
flyctl apps create mood-intel-frontend

# Deploy
flyctl deploy

# Get your frontend URL
flyctl info
# Open the URL in your browser
```

### 6. Test the Messaging Flow

#### Send a Test Prompt (SMS)
```bash
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "channel": "sms"}'
```

#### Send a Test Prompt (WhatsApp)
```bash
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "channel": "whatsapp"}'
```

#### Test Locally Without Twilio
```bash
# Test SMS webhook
curl -X POST http://localhost:8080/api/sms/test-inbound \
  -H "Content-Type: application/json" \
  -d '{"message": "4, M, testing, coding", "from": "+1234567890", "channel": "sms"}'

# Test WhatsApp webhook
curl -X POST http://localhost:8080/api/sms/test-inbound \
  -H "Content-Type: application/json" \
  -d '{"message": "5, H, testing WhatsApp, deploying", "from": "+1234567890", "channel": "whatsapp"}'
```

Or use the included test script:
```bash
chmod +x scripts/test-whatsapp-integration.sh
./scripts/test-whatsapp-integration.sh http://localhost:8080
```

#### Set Up Scheduled Prompts
Set up scheduled messages in Twilio to send hourly prompts (8am-10pm) via SMS or WhatsApp.

## Local Development

### Backend

```bash
cd backend

# Download PocketBase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.20/pocketbase_0.22.20_linux_amd64.zip
unzip pocketbase_0.22.20_linux_amd64.zip

# Generate Twilio auth header
echo -n "your_sid:your_token" | base64
# Copy the output

# Set environment variables
export CLAUDE_API_KEY="your_key"
export TWILIO_ACCOUNT_SID="your_sid"
export TWILIO_AUTH_HEADER="Basic <paste_base64_output_here>"
export TWILIO_PHONE_NUMBER="+1234567890"
export YOUR_PHONE_NUMBER="+1234567890"

# Run PocketBase
./pocketbase serve --http=0.0.0.0:8080
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_POCKETBASE_URL=http://localhost:8080" > .env

# Run dev server
npm run dev
```

Open http://localhost:5173 in your browser.

## Database Schema

### Entries Collection

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | When the entry was created |
| raw_text | text | Original SMS message |
| mood | number | Mood rating (1-5) |
| energy | select | Energy level (L/M/H) |
| doing | text | What user is doing |
| intention | text | What user plans to do next |
| doing_category | select | Activity category |
| location | text | Where user is |
| social_context | text | Who user is with |
| insights | json | AI-generated insights |
| response_time_seconds | number | Time to respond |
| word_count | number | Words in raw text |

### Summaries Collection

| Field | Type | Description |
|-------|------|-------------|
| date | datetime | Summary date |
| type | select | daily/weekly |
| content | text | AI-generated summary |
| metrics | json | Calculated metrics |

## Usage

### Message Format (SMS or WhatsApp)

When you receive a check-in prompt:
```
Quick check-in: Mood (1-5), Energy (L/M/H), Doing, Next hour?
```

Reply with something like:
```
4 H working from coffee shop, going to tackle emails
```

The system will:
1. Automatically detect if you're using SMS or WhatsApp
2. Extract structured data (mood: 4, energy: H, doing: "working from coffee shop", etc.)
3. Store in database with channel information
4. Generate insights if patterns are detected
5. Send confirmation via the same channel

**Note**: Both SMS and WhatsApp messages are processed identically - the system automatically detects which channel you're using and responds accordingly.

### Dashboard Views

**Daily View**
- Select a date to see all entries
- Mood/energy line chart shows trends
- Timeline of entries with details
- AI insights for notable changes

**Weekly View**
- 7x15 heatmap (days × hours) colored by mood
- Daily averages
- Weekly summary with patterns

## Customization

### Adjust Check-in Hours

Edit the heatmap hours in `frontend/src/components/WeeklyView.jsx`:

```javascript
const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8am to 10pm
```

### Modify Claude Prompts

Edit prompts in `backend/pb_hooks/sms.pb.js` to change how data is extracted or insights are generated.

### Change Mood Scale

Update the mood field validation in `backend/pb_migrations/1728393600_created_entries.js` and frontend components.

## Troubleshooting

**SMS/WhatsApp not received:**
- Check Twilio webhook URL is correct (should be same for both channels)
- View Twilio logs in console to see delivery status
- Check backend logs: `flyctl logs -a mood-intel-backend`
- Look for `[SMS]` or `[WHATSAPP]` prefixes in logs to verify channel detection

**WhatsApp-specific issues:**
- **Sandbox not working**: Make sure you've joined the sandbox by sending `join <code>` to the Twilio WhatsApp number
- **Message not delivered**: Check if your number is still connected to the sandbox (sandbox connections expire after 72 hours of inactivity)
- **Production approval pending**: Use the sandbox for testing while waiting for approval
- **Template rejected**: Review Twilio's WhatsApp template guidelines and resubmit

**Message sent but no confirmation:**
- Check Twilio account balance
- Verify TWILIO_PHONE_NUMBER is set correctly
- For WhatsApp, ensure you're using the sandbox number or approved WhatsApp sender
- Check backend logs for Twilio API errors

**Claude API errors:**
- Verify API key is set correctly
- Check backend logs for error messages
- Ensure you have API credits

**Authentication issues:**
- Create a user in PocketBase admin panel
- Clear browser cookies and try again
- Check VITE_POCKETBASE_URL is correct

**Channel detection issues:**
- Backend automatically detects channel based on `From` field format
- SMS: `From=+1234567890`
- WhatsApp: `From=whatsapp:+1234567890`
- Check logs for `[SMS]` or `[WHATSAPP]` prefix to verify detection

## Cost Estimates

### Using SMS:
- **Fly.io**: ~$5-10/month (backend + frontend + storage)
- **Twilio SMS**: ~$1-2/month (1 phone number + ~500 messages)
- **Claude API**: ~$1-3/month (depending on usage)

**Total: ~$7-15/month**

### Using WhatsApp (Recommended for NZ):
- **Fly.io**: ~$5-10/month (backend + frontend + storage)
- **Twilio WhatsApp**: ~$0.50-1/month (WhatsApp conversations are cheaper than SMS!)
  - Sandbox: FREE for testing
  - Production: ~$0.005-0.01 per conversation (much cheaper than SMS)
  - User-initiated conversations may be free depending on region
- **Claude API**: ~$1-3/month (depending on usage)

**Total: ~$6.50-14/month** (potentially cheaper than SMS!)

**Note**: WhatsApp pricing is conversation-based (24-hour windows), not per-message, so you can send multiple messages within a conversation for the same cost. This makes WhatsApp significantly cheaper for frequent check-ins.

## Future Enhancements

- Weekly AI summaries via email
- Correlation analysis (mood vs activity, location, etc.)
- Export data to CSV
- Mood predictions based on patterns
- Voice note check-ins
- Integration with calendar/weather data

## License

MIT

## Support

Open an issue on GitHub if you encounter problems or have questions.
