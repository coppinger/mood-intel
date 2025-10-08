/// <reference path="../pb_data/types.d.ts" />

console.log('[HOOK] Loading messaging.pb.js (SMS + WhatsApp support)...');

/**
 * Twilio webhook endpoint to receive SMS and WhatsApp messages
 * Works with both channels - automatically detects based on From field
 *
 * Note: Helper functions are inlined due to PocketBase's isolated callback execution
 */
routerAdd('POST', '/api/sms/webhook', (c) => {
  try {
    // Get the request data (Twilio sends form data)
    const info = $apis.requestInfo(c);
    const from = info.data.From;
    const body = info.data.Body;
    const timestamp = new Date();

    // Detect channel and clean phone number (inlined due to PocketBase scoping)
    const channel = from && from.startsWith('whatsapp:') ? 'whatsapp' : 'sms';
    const cleanFrom = from ? from.replace(/^(whatsapp:|sms:)/, '') : from;

    console.log(`[${channel.toUpperCase()}] Received message from ${cleanFrom}: ${body}`);

    // Process the message with Claude - INLINED
    const prompt = `You are analyzing a mood check-in SMS. Extract structured data from the following message.

The user was asked: "Quick check-in: Mood (1-5), Energy (L/M/H), Doing, Next hour?"

Their response: "${body}"

Extract and return a JSON object with:
{
  "mood": <number 1-5, or null if not mentioned>,
  "energy": <"L", "M", "H", or null if not mentioned>,
  "doing": <what they're currently doing, or null>,
  "intention": <what they plan to do next, or null>,
  "doing_category": <one of: "work", "social", "rest", "exercise", "chores", "transit", or null>,
  "location": <where they are, or null>,
  "social_context": <who they're with, or null>,
  "insights": {
    "notable_change": <if mood/energy seems significantly different from normal, note it>,
    "energy_mood_mismatch": <if energy and mood seem misaligned, note it>,
    "observation": <any other brief observation about this entry>
  },
  "word_count": <number of words in the raw text>
}

Be concise in insights. Only include insight fields if there's something notable. Return ONLY the JSON object, no markdown or explanation.`;

    let extracted;
    try {
      const claudeResponse = $http.send({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': $os.getenv('CLAUDE_API_KEY'),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        }),
        timeout: 30
      });

      if (claudeResponse.statusCode === 200) {
        const claudeData = claudeResponse.json;
        let content = claudeData.content[0].text;

        // Strip markdown code blocks if present
        content = content.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');

        extracted = JSON.parse(content.trim());
      } else {
        throw new Error(`Claude API returned status ${claudeResponse.statusCode}`);
      }
    } catch (error) {
      console.error('Error processing entry with Claude:', error);
      // Return minimal data if Claude fails
      extracted = {
        mood: null,
        energy: null,
        doing: null,
        intention: null,
        doing_category: null,
        location: null,
        social_context: null,
        insights: {},
        word_count: body.split(/\s+/).length
      };
    }

    // Create the entry record
    const collection = $app.dao().findCollectionByNameOrId('entries');
    const record = new Record(collection);

    record.set('timestamp', timestamp.toISOString());
    record.set('raw_text', body);
    record.set('mood', extracted.mood);
    record.set('energy', extracted.energy);
    record.set('doing', extracted.doing);
    record.set('intention', extracted.intention);
    record.set('doing_category', extracted.doing_category);
    record.set('location', extracted.location);
    record.set('social_context', extracted.social_context);
    record.set('insights', extracted.insights);
    record.set('response_time_seconds', null);
    record.set('word_count', extracted.word_count);

    $app.dao().saveRecord(record);

    console.log('Entry saved:', record.id);

    // Send confirmation message (SMS or WhatsApp)
    try {
      // Base64 encoding function
      const base64Encode = function(str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        let i = 0;
        while (i < str.length) {
          const a = str.charCodeAt(i++);
          const b = i < str.length ? str.charCodeAt(i++) : 0;
          const c = i < str.length ? str.charCodeAt(i++) : 0;
          const bitmap = (a << 16) | (b << 8) | c;
          output += chars.charAt((bitmap >> 18) & 63) + chars.charAt((bitmap >> 12) & 63);
          output += (i - 2 < str.length) ? chars.charAt((bitmap >> 6) & 63) : '=';
          output += (i - 1 < str.length) ? chars.charAt(bitmap & 63) : '=';
        }
        return output;
      };

      const twilioSid = $os.getenv('TWILIO_ACCOUNT_SID');
      const twilioToken = $os.getenv('TWILIO_AUTH_TOKEN');
      const twilioPhone = $os.getenv('TWILIO_PHONE_NUMBER');
      const confirmationMessage = '✓ Check-in recorded. Thanks!';

      // Build Basic Auth header from SID and Token
      const credentials = `${twilioSid}:${twilioToken}`;
      const authHeader = `Basic ${base64Encode(credentials)}`;

      // Format phone numbers based on channel (add 'whatsapp:' prefix if needed)
      const cleanTwilioPhone = twilioPhone ? twilioPhone.replace(/^(whatsapp:|sms:)/, '') : twilioPhone;
      const formattedFrom = channel === 'whatsapp' ? `whatsapp:${cleanTwilioPhone}` : cleanTwilioPhone;
      const formattedTo = from; // Already has correct format from Twilio

      $http.send({
        url: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `From=${encodeURIComponent(formattedFrom)}&To=${encodeURIComponent(formattedTo)}&Body=${encodeURIComponent(confirmationMessage)}`,
        timeout: 30
      });

      console.log(`[${channel.toUpperCase()}] Confirmation sent to ${cleanFrom}`);
    } catch (smsError) {
      console.error(`[${channel.toUpperCase()}] Error sending confirmation:`, smsError);
    }

    // Return TwiML response (Twilio expects XML)
    c.response().header().set('Content-Type', 'text/xml');
    return c.xml(200, '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  } catch (error) {
    console.error('Error in SMS webhook:', error);
    c.response().header().set('Content-Type', 'text/xml');
    return c.xml(500, '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing your message</Message></Response>');
  }
}, $apis.requireGuestOnly())

/**
 * Twilio message status callback endpoint
 */
routerAdd('POST', '/api/sms/status-callback', (c) => {
  try {
    // Get status callback data from Twilio
    const info = $apis.requestInfo(c);
    const messageSid = info.data.MessageSid;
    const messageStatus = info.data.MessageStatus;
    const errorCode = info.data.ErrorCode;
    const errorMessage = info.data.ErrorMessage;
    const to = info.data.To;
    const from = info.data.From;

    console.log(`[SMS Status Callback] SID: ${messageSid}, Status: ${messageStatus}, To: ${to}`);

    if (errorCode) {
      console.error(`[SMS Error] Code: ${errorCode}, Message: ${errorMessage}`);
    }

    // Return 200 to acknowledge receipt
    return c.json(200, { received: true });
  } catch (error) {
    console.error('Error in status callback:', error);
    return c.json(500, { error: String(error) });
  }
}, $apis.requireGuestOnly())

/**
 * Endpoint to manually send a check-in prompt (supports SMS and WhatsApp)
 * POST body: { "phone_number": "+1234567890", "channel": "sms" | "whatsapp" }
 */
routerAdd('POST', '/api/sms/send-prompt', (c) => {
  try {
    // Base64 encoding function
    const base64Encode = function(str) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      let i = 0;
      while (i < str.length) {
        const a = str.charCodeAt(i++);
        const b = i < str.length ? str.charCodeAt(i++) : 0;
        const c = i < str.length ? str.charCodeAt(i++) : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        output += chars.charAt((bitmap >> 18) & 63) + chars.charAt((bitmap >> 12) & 63);
        output += (i - 2 < str.length) ? chars.charAt((bitmap >> 6) & 63) : '=';
        output += (i - 1 < str.length) ? chars.charAt(bitmap & 63) : '=';
      }
      return output;
    };

    const data = $apis.requestInfo(c).data;
    const phoneNumber = data.phone_number || $os.getenv('YOUR_PHONE_NUMBER');
    const channel = data.channel || 'sms'; // Default to SMS for backwards compatibility
    const message = 'Quick check-in: Mood (1-5), Energy (L/M/H), Doing, Next hour?';

    console.log(`[${channel.toUpperCase()}] Sending prompt to ${phoneNumber}`);

    // Send message via Twilio (SMS or WhatsApp)
    const twilioSid = $os.getenv('TWILIO_ACCOUNT_SID');
    const twilioToken = $os.getenv('TWILIO_AUTH_TOKEN');
    const twilioPhone = $os.getenv('TWILIO_PHONE_NUMBER');

    // Validate credentials
    if (!twilioSid || !twilioToken) {
      console.error('Missing Twilio credentials');
      return c.json(500, { success: false, error: 'Missing Twilio credentials' });
    }

    // Warn if auth token looks incorrect (should be ~32 chars)
    if (twilioToken.length !== 32) {
      console.warn(`TWILIO_AUTH_TOKEN has unusual length: ${twilioToken.length} (expected 32). This may cause authentication issues.`);
    }

    // Build Basic Auth header from SID and Token
    const credentials = `${twilioSid}:${twilioToken}`;
    const encodedCredentials = base64Encode(credentials);
    const authHeader = `Basic ${encodedCredentials}`;

    // Get the base URL for the status callback
    const baseUrl = $os.getenv('PUBLIC_URL') || 'https://mood-intel-backend.fly.dev';
    const statusCallbackUrl = `${baseUrl}/api/sms/status-callback`;

    // Format phone numbers based on channel (inlined due to PocketBase scoping)
    const cleanTwilioPhone = twilioPhone ? twilioPhone.replace(/^(whatsapp:|sms:)/, '') : twilioPhone;
    const formattedFrom = channel === 'whatsapp' ? `whatsapp:${cleanTwilioPhone}` : cleanTwilioPhone;
    const cleanPhoneNumber = phoneNumber ? phoneNumber.replace(/^(whatsapp:|sms:)/, '') : phoneNumber;
    const formattedTo = channel === 'whatsapp' ? `whatsapp:${cleanPhoneNumber}` : cleanPhoneNumber;

    const twilioResponse = $http.send({
      url: `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `From=${encodeURIComponent(formattedFrom)}&To=${encodeURIComponent(formattedTo)}&Body=${encodeURIComponent(message)}&StatusCallback=${encodeURIComponent(statusCallbackUrl)}`,
      timeout: 30
    });

    console.log(`[${channel.toUpperCase()}] Twilio response status:`, twilioResponse.statusCode);
    console.log(`[${channel.toUpperCase()}] Twilio response body:`, twilioResponse.raw);
    console.log(`[${channel.toUpperCase()}] Phone numbers - From: ${formattedFrom}, To: ${formattedTo}`);

    if (twilioResponse.statusCode === 201 || twilioResponse.statusCode === 200) {
      const responseData = twilioResponse.json;
      const messageSid = responseData?.sid;
      const messageStatus = responseData?.status;
      const errorCode = responseData?.error_code;
      const errorMessage = responseData?.error_message;

      console.log('Twilio Message SID:', messageSid);
      console.log('Twilio Message Status:', messageStatus);
      if (errorCode) {
        console.log('Twilio Error Code:', errorCode, 'Message:', errorMessage);
      }

      return c.json(200, {
        success: true,
        message: 'Prompt sent',
        debug: {
          status: twilioResponse.statusCode,
          to: phoneNumber,
          messageSid: messageSid,
          messageStatus: messageStatus,
          errorCode: errorCode,
          errorMessage: errorMessage
        }
      });
    } else {
      const errorResponse = twilioResponse.json;
      const errorCode = errorResponse?.code;
      const errorMsg = errorResponse?.message;

      console.error('Twilio API error:', twilioResponse.statusCode, twilioResponse.raw);

      // Check for common trial account errors
      let userMessage = 'Failed to send prompt';
      if (errorCode === 21608) {
        userMessage = 'Phone number not verified. For trial accounts, verify the number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified';
      } else if (errorCode === 21211) {
        userMessage = 'Invalid phone number format';
      } else if (errorCode === 21606) {
        userMessage = 'Twilio phone number not configured correctly';
      } else if (errorMsg) {
        userMessage = errorMsg;
      }

      return c.json(500, {
        success: false,
        message: userMessage,
        error: twilioResponse.raw,
        errorCode: errorCode
      });
    }
  } catch (error) {
    console.error('Error sending prompt:', error);
    return c.json(500, { success: false, error: error.message });
  }
}, $apis.requireAdminAuth())

/**
 * Test endpoint to simulate receiving an inbound SMS or WhatsApp message
 * POST body: { "message": "...", "from": "+1234567890", "channel": "sms" | "whatsapp" }
 */
routerAdd('POST', '/api/sms/test-inbound', (c) => {
  try {
    const data = $apis.requestInfo(c).data;
    const testMessage = data.message || "4, M, working from cafe, probably code some more";
    const channel = data.channel || 'sms';
    const phoneNumber = data.from || $os.getenv('YOUR_PHONE_NUMBER') || '+1234567890';

    // Format phone number based on channel (inlined due to PocketBase scoping)
    const cleanPhone = phoneNumber ? phoneNumber.replace(/^(whatsapp:|sms:)/, '') : phoneNumber;
    const testFrom = channel === 'whatsapp' ? `whatsapp:${cleanPhone}` : cleanPhone;

    console.log(`[TEST ${channel.toUpperCase()}] Simulating message from ${testFrom}: ${testMessage}`);

    // Process the message with Claude
    const prompt = `You are analyzing a mood check-in SMS. Extract structured data from the following message.

The user was asked: "Quick check-in: Mood (1-5), Energy (L/M/H), Doing, Next hour?"

Their response: "${testMessage}"

Extract and return a JSON object with:
{
  "mood": <number 1-5, or null if not mentioned>,
  "energy": <"L", "M", "H", or null if not mentioned>,
  "doing": <what they're currently doing, or null>,
  "intention": <what they plan to do next, or null>,
  "doing_category": <one of: "work", "social", "rest", "exercise", "chores", "transit", or null>,
  "location": <where they are, or null>,
  "social_context": <who they're with, or null>,
  "insights": {
    "notable_change": <if mood/energy seems significantly different from normal, note it>,
    "energy_mood_mismatch": <if energy and mood seem misaligned, note it>,
    "observation": <any other brief observation about this entry>
  },
  "word_count": <number of words in the raw text>
}

Be concise in insights. Only include insight fields if there's something notable. Return ONLY the JSON object, no markdown or explanation.`;

    let extracted;
    try {
      const claudeResponse = $http.send({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': $os.getenv('CLAUDE_API_KEY'),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        }),
        timeout: 30
      });

      if (claudeResponse.statusCode === 200) {
        const claudeData = claudeResponse.json;
        let content = claudeData.content[0].text;
        console.log('[TEST] Claude raw response:', content);

        // Strip markdown code blocks if present
        content = content.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        console.log('[TEST] After stripping markdown:', content.substring(0, 50) + '...');

        extracted = JSON.parse(content.trim());
      } else {
        console.error('[TEST] Claude API error status:', claudeResponse.statusCode);
        console.error('[TEST] Claude API error body:', claudeResponse.raw);
        throw new Error(`Claude API returned status ${claudeResponse.statusCode}`);
      }
    } catch (error) {
      console.error('[TEST] Error processing entry with Claude:', error);
      extracted = {
        mood: null,
        energy: null,
        doing: null,
        intention: null,
        doing_category: null,
        location: null,
        social_context: null,
        insights: {},
        word_count: testMessage.split(/\s+/).length
      };
    }

    // Create the entry record
    const timestamp = new Date();
    const collection = $app.dao().findCollectionByNameOrId('entries');
    const record = new Record(collection);

    record.set('timestamp', timestamp.toISOString());
    record.set('raw_text', testMessage);
    record.set('mood', extracted.mood);
    record.set('energy', extracted.energy);
    record.set('doing', extracted.doing);
    record.set('intention', extracted.intention);
    record.set('doing_category', extracted.doing_category);
    record.set('location', extracted.location);
    record.set('social_context', extracted.social_context);
    record.set('insights', extracted.insights);
    record.set('response_time_seconds', null);
    record.set('word_count', extracted.word_count);

    $app.dao().saveRecord(record);

    console.log('[TEST] Entry saved:', record.id);

    // Return JSON response with the parsed data
    return c.json(200, {
      success: true,
      message: 'Test entry created',
      test_mode: true,
      entry: {
        id: record.id,
        timestamp: timestamp.toISOString(),
        raw_text: testMessage,
        extracted: extracted
      }
    });

  } catch (error) {
    console.error('[TEST] Error processing test message:', error);
    return c.json(500, { success: false, error: String(error) });
  }
}, $apis.requireAdminAuth())

console.log('SMS webhook routes registered');
