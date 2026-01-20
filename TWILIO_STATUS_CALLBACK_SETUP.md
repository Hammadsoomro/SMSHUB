# Twilio Status Callback Webhook Setup

## ✅ Webhook Endpoints

Your app now has two webhooks:

### 1. **Inbound SMS Webhook** (Receives incoming messages)
- **URL**: `https://conneclify.com/api/webhooks/inbound-sms`
- **Method**: POST
- **Purpose**: Receives incoming SMS messages from Twilio
- **Status**: Already configured

### 2. **Status Callback Webhook** (NEW - Tracks message delivery)
- **URL**: `https://conneclify.com/api/webhooks/status`
- **Method**: POST
- **Purpose**: Receives delivery status updates (sent, delivered, failed, undelivered)
- **Status**: ✅ Ready to configure

---

## 📋 How to Configure Status Callback in Twilio

### Step 1: Go to Twilio Console
1. Log in to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging > Settings > General**

### Step 2: Add Status Callback URL
1. Find the **Status Callback URL** field
2. Enter: `https://conneclify.com/api/webhooks/status`
3. Make sure **HTTP Method** is set to **POST**

### Step 3: Save and Test
1. Click **Save**
2. Send a test message to verify the webhook is working
3. Check your app logs to confirm status updates are being received

---

## 📊 What Status Updates You'll Receive

Once configured, you'll receive status callbacks for:

| Status | Meaning |
|--------|---------|
| `queued` | Message queued for delivery |
| `sent` | Message sent to carrier |
| `delivered` | Message delivered to recipient |
| `failed` | Delivery failed |
| `undelivered` | Message undelivered (carrier rejected) |

---

## 🔍 Webhook Data Received

Each status callback includes:

```json
{
  "MessageSid": "SM1234567890abcdef",
  "MessageStatus": "delivered",
  "Timestamp": "2026-01-20T10:30:00Z",
  "ErrorCode": null,
  "ErrorMessage": null
}
```

---

## 💾 How Your App Stores Status

When a status callback is received:

1. ✅ Message status is updated in database
2. ✅ Delivery errors are logged (if any)
3. ✅ Real-time update sent via Ably to connected clients
4. ✅ Admin and team members see status change immediately

---

## 🐛 Debugging Status Callbacks

### View Webhook Logs
1. In Twilio Console → **Messaging > Settings > Webhooks**
2. Scroll down to **Webhook Logs** section
3. Check for any failed requests

### Check App Logs
Look for logs like:
```
[handleStatusCallback] Status callback received
[handleStatusCallback] MessageSid: SM1234567890abcdef
[handleStatusCallback] MessageStatus: delivered
[handleStatusCallback] ✅ Status callback processed successfully
```

### Common Issues

**Issue**: Webhook not triggered
- **Solution**: Verify URL is correct (include `https://`)
- **Solution**: Check Twilio credentials are correct

**Issue**: 403 Forbidden
- **Solution**: Twilio signature validation failing
- **Solution**: Ensure webhook is being called with correct Auth Token

**Issue**: Message not found in database
- **Solution**: Status callback may arrive before message is stored
- **Solution**: App will queue it and retry (normal behavior)

---

## 🔗 Related Files

- **Webhook Handler**: `server/routes/webhooks.ts` → `handleStatusCallback`
- **Routes**: `server/index.ts` (line ~228)
- **Storage Methods**: `server/storage.ts` → `getMessageBySid`, `updateMessage`
- **Message Model**: `server/models/index.ts` → Message schema
- **Types**: `shared/api.ts` → Message interface

---

## ✨ Features Enabled by Status Callback

With status callback configured:

- ✅ See real-time delivery status for sent messages
- ✅ Track failed deliveries and error reasons
- ✅ Monitor SMS campaign success rates
- ✅ Improve team visibility on message status
- ✅ Debug delivery issues with error codes

---

## 📞 Support

If webhook is not working:
1. Check Twilio console logs
2. Verify webhook URL is accessible
3. Ensure Auth Token is correct
4. Check app server logs for errors
5. Contact support if issues persist
