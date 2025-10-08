# Setting Up Recurring SMS Prompts

Since Twilio doesn't have native recurring scheduled messages, here are options for sending hourly check-in prompts:

## Option 1: Cron Job (Recommended for self-hosting)

If you have a server or machine that's always on:

1. Create a script `send-prompt.sh`:

```bash
#!/bin/bash
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

2. Add to crontab (edit with `crontab -e`):

```cron
# Send check-in prompt every hour from 8am-10pm
0 8-22 * * * /path/to/send-prompt.sh
```

## Option 2: GitHub Actions (Free, cloud-based)

Create `.github/workflows/send-prompts.yml`:

```yaml
name: Send SMS Prompts

on:
  schedule:
    # Runs every hour from 8am-10pm UTC (adjust for your timezone)
    - cron: '0 8-22 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  send-prompt:
    runs-on: ubuntu-latest
    steps:
      - name: Send SMS Prompt
        env:
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
          ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}
        run: |
          curl -X POST $BACKEND_URL/api/sms/send-prompt \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json"
```

Add secrets in GitHub repo settings:
- `BACKEND_URL`: https://mood-intel-backend.fly.dev
- `ADMIN_TOKEN`: Your PocketBase admin token

## Option 3: Fly.io Machines (Paid)

Use Fly.io's cron support:

1. Create `backend/cron.toml`:

```toml
[processes]
  app = "/pb/pocketbase serve --http=0.0.0.0:8080"

[experimental]
  [[experimental.processes]]
    cmd = "curl -X POST http://localhost:8080/api/sms/send-prompt -H 'Authorization: Bearer $ADMIN_TOKEN'"
    schedule = "0 8-22 * * *"
```

2. Deploy with cron enabled

## Option 4: Twilio Messaging Services

1. Go to Twilio Console → Messaging Services
2. Create a new service
3. Enable "Sender Pool" and add your phone number
4. Set up recurring schedules (if available in your plan)

## Getting Admin Token

To get your PocketBase admin token for API calls:

```bash
curl -X POST https://mood-intel-backend.fly.dev/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"your@email.com","password":"yourpassword"}'
```

Copy the `token` from the response and use it in your cron job.

## Testing

Send a manual prompt:

```bash
curl -X POST https://mood-intel-backend.fly.dev/api/sms/send-prompt \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```
