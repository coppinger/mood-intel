# Mood Intel

Personal mood and energy tracking system via SMS. Text-based check-ins processed by Claude AI, stored in PocketBase, and displayed on a React dashboard.

## Features

- **SMS Check-ins**: Receive hourly prompts and reply with your mood, energy level, and what you're doing
- **AI Processing**: Claude API extracts structured data and generates insights from your responses
- **Daily View**: Timeline of entries with mood/energy charts
- **Weekly View**: Heatmap visualization showing patterns across the week
- **Secure**: Password-protected dashboard with single-user authentication

## Tech Stack

- **Backend**: PocketBase (self-hosted database and API)
- **SMS**: Twilio
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

1. Go to your [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers → Your active number
3. Under "Messaging", set webhook URL to:
   ```
   https://mood-intel-backend.fly.dev/api/sms/webhook
   ```
4. Set HTTP method to `POST`
5. Save

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

### 6. Test the SMS Flow

Send a test SMS to manually trigger a check-in:

```bash
# Using the backend API
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

Or set up scheduled messages in Twilio to send hourly prompts (8am-10pm).

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

### SMS Format

When you receive a check-in prompt:
```
Quick check-in: Mood (1-5), Energy (L/M/H), Doing, Next hour?
```

Reply with something like:
```
4 H working from coffee shop, going to tackle emails
```

The system will:
1. Extract structured data (mood: 4, energy: H, doing: "working from coffee shop", etc.)
2. Store in database
3. Generate insights if patterns are detected
4. Send confirmation

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

**SMS not received:**
- Check Twilio webhook URL is correct
- View Twilio logs in console
- Check backend logs: `flyctl logs -a mood-intel-backend`

**Claude API errors:**
- Verify API key is set correctly
- Check backend logs for error messages
- Ensure you have API credits

**Authentication issues:**
- Create a user in PocketBase admin panel
- Clear browser cookies and try again
- Check VITE_POCKETBASE_URL is correct

## Cost Estimates

- **Fly.io**: ~$5-10/month (backend + frontend + storage)
- **Twilio**: ~$1-2/month (1 phone number + SMS)
- **Claude API**: ~$1-3/month (depending on usage)

**Total: ~$7-15/month**

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
