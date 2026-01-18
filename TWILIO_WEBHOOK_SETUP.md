# Twilio SMS Webhook Setup Guide

This guide explains how to configure your Twilio account to send SMS webhooks to **conneclify.com**.

## Overview

Your conneclify application receives inbound SMS messages through Twilio webhooks. When someone sends an SMS to your Twilio phone number, Twilio will POST the message details to your webhook endpoint.

## Webhook Endpoint

**Production Webhook URL:**
```
https://conneclify.com/api/webhooks/inbound-sms
```

**Health Check URL (optional):**
```
https://conneclify.com/api/webhooks/inbound-sms
```

## Setup Instructions

### Step 1: Log into Twilio Console

1. Visit [Twilio Console](https://www.twilio.com/console)
2. Sign in with your credentials
3. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**

### Step 2: Select Your Phone Number

1. Click on the phone number you want to configure
2. Look for the section labeled **"Messaging"** or **"SMS & MMS"**

### Step 3: Configure Webhook URLs

Under the **Messaging** section, you should see:

#### **A Message Comes In**
- **Webhook Type:** Select **HTTP POST**
- **Webhook URL:** Enter:
  ```
  https://conneclify.com/api/webhooks/inbound-sms
  ```
- **Fallback URL (optional):** Leave empty or set to the same URL
- **HTTP Method:** Select **HTTP POST**

#### **Status Callback URL (optional)**
- **URL:** Enter:
  ```
  https://conneclify.com/api/webhooks/inbound-sms
  ```
- **HTTP Method:** Select **HTTP POST**

### Step 4: Save Configuration

1. Click the **Save** button at the bottom of the page
2. You should see a confirmation message

## Webhook Security

Your conneclify application validates all incoming Twilio webhooks using:
- **Twilio Auth Token** (set in your environment)
- **Twilio Request Signature** validation

**Important:** Make sure you have set the `TWILIO_AUTH_TOKEN` environment variable in your deployment.

## Testing the Webhook

### Option 1: Using Twilio Console

1. In the Twilio Console, under your phone number's messaging section
2. Scroll to **"Webhook Testing"**
3. Click **"Make Request"** to send a test webhook
4. Check your application logs for confirmation

### Option 2: Manual Testing

Send an SMS to your Twilio phone number:
```
From any phone:
Text: "Hello Test"
To: [Your Twilio Phone Number]
```

Check your conneclify logs to see if the message was received:
- Messages should appear in your contacts list
- Unread badge should update
- Real-time updates via Ably should notify connected clients

### Option 3: Webhook Health Check

Verify the webhook endpoint is accessible:
```bash
curl https://conneclify.com/api/webhooks/inbound-sms

# Expected response:
{"status":"ok","timestamp":"2026-01-17T20:30:00.000Z"}
```

## Troubleshooting

### "Webhook URL is invalid" Error

**Possible causes:**
1. Domain not accessible from the internet
2. SSL certificate issues
3. URL is blocked by firewall

**Solutions:**
- Verify conneclify.com is publicly accessible
- Check SSL certificate is valid
- Ensure firewall allows HTTPS traffic on port 443

### Messages Not Receiving

**Check:**
1. Webhook URL is correctly entered in Twilio Console
2. Phone number is active in Twilio
3. Application logs for errors
4. Twilio request signature validation is passing

**View Twilio Logs:**
1. In Twilio Console, go to **Logs** → **Debugger**
2. Look for your phone number's webhook attempts
3. Check HTTP response codes and error messages

### Authentication Failed

**Possible causes:**
1. `TWILIO_AUTH_TOKEN` environment variable not set
2. `TWILIO_ACCOUNT_SID` environment variable not set
3. Invalid credentials

**Solutions:**
1. Verify environment variables in production:
   ```bash
   echo $TWILIO_AUTH_TOKEN
   echo $TWILIO_ACCOUNT_SID
   ```
2. Ensure values are correctly set (no extra spaces or quotes)

## Required Environment Variables

Make sure these are set in your production environment:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
CORS_ORIGIN=https://conneclify.com
NODE_ENV=production
```

## Multiple Phone Numbers

If you have multiple Twilio phone numbers:

1. Each phone number needs the same webhook URL configured
2. The webhook will automatically route messages to the correct number
3. Phone number matching is done by the `To` field in the webhook

## Webhook Request Format

When Twilio sends a message, it includes:

```
POST /api/webhooks/inbound-sms

Form Data:
- From: +1234567890        (Sender's phone number)
- To: +0987654321          (Your Twilio phone number)
- Body: Hello World         (Message content)
- MessageSid: SM1234...     (Unique message ID)
- AccountSid: AC1234...     (Your Twilio account ID)
```

## Response Format

Your application responds with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

This tells Twilio the webhook was processed successfully.

## Monitoring

To monitor incoming webhooks:

1. Check application logs for `[handleInboundSMS]` entries
2. Verify messages appear in the database
3. Confirm real-time notifications are sent to connected clients
4. Check unread count updates on contacts

## Support

If you continue to have issues:

1. Check [Twilio Documentation](https://www.twilio.com/docs/messaging/webhooks)
2. Review application error logs
3. Verify all credentials are correct
4. Ensure phone number is active and not rate-limited

---

**Last Updated:** January 17, 2026
**conneclify Version:** 1.0.0
