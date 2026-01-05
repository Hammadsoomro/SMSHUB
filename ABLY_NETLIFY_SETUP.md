# Ably Netlify Serverless Integration Guide

Professional Ably real-time messaging integration for Netlify serverless functions.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
- [API Functions](#api-functions)
- [Authentication](#authentication)
- [Usage Examples](#usage-examples)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🚀 Overview

This integration provides professional-grade serverless functions for:

- **Real-time messaging** via Ably channels
- **Token generation** for secure client authentication
- **Channel management** with authorization checks
- **Health monitoring** and statistics

### Key Features

✅ **Production-Ready**

- Comprehensive error handling
- Request tracking and logging
- Security headers and CORS support
- Timeout protection (10s per function)

✅ **Scalable Architecture**

- Stateless functions
- Connection pooling
- Graceful degradation

✅ **Secure**

- JWT authentication on all endpoints
- Channel access validation
- Per-user isolation

✅ **Observable**

- Request IDs for tracing
- Detailed logging
- Health monitoring

## 🏗️ Architecture

```
Client (Browser)
    ↓
    ├─→ POST /api/ably/token → ably-token.ts
    │   (Get Ably API key)
    │
    ├─→ POST /api/ably/publish → ably-publish.ts
    │   (Publish to Ably channels)
    │
    └─→ GET /api/ably/stats → ably-stats.ts
        (Check health & stats)
        ↓
    Ably Global Network
        ↓
    Connected Clients (Real-time updates)
```

## 🔧 Setup

### 1. Environment Variables

Required environment variables (set in Netlify):

```bash
# Ably Configuration
ABLY_API_KEY=your_ably_api_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# MongoDB Configuration
MONGODB_URI=your_mongodb_uri_here

# CORS Configuration (optional)
CORS_ORIGIN=https://yourdomain.com
```

### 2. Netlify Configuration

The `netlify.toml` already includes:

```toml
[functions."ably-token"]
  description = "Generate Ably authentication tokens"
  memory = 256
  timeout = 10

[functions."ably-publish"]
  description = "Publish messages to Ably channels"
  memory = 256
  timeout = 10

[functions."ably-stats"]
  description = "Get Ably channel statistics and health"
  memory = 256
  timeout = 10
```

### 3. Deploy

```bash
# Deploy to Netlify
npm run build
netlify deploy --prod

# Or push to git branch for automatic deployment
git push origin main
```

## 📡 API Functions

### 1. Get Ably Token (`ably-token`)

**Endpoint:** `POST /api/ably/token`

**Purpose:** Generate Ably API key for authenticated clients

**Request Headers:**

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Response (200 OK):**

```json
{
  "token": "eVcgxA.vhqQCg:Z-Qkr-...",
  "expiresIn": 3600,
  "userId": "user_123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "error": "Token verification failed",
  "requestId": "ably-token-1705318200000-abc123"
}
```

---

### 2. Publish to Ably (`ably-publish`)

**Endpoint:** `POST /api/ably/publish`

**Purpose:** Publish messages to Ably channels with authorization

**Request Headers:**

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**

```json
{
  "channelName": "sms:userId:contactId",
  "eventName": "message",
  "data": {
    "contactId": "contact_123",
    "userId": "user_123",
    "phoneNumberId": "phone_456",
    "message": "Hello!",
    "direction": "inbound",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "from": "+1234567890",
    "to": "+0987654321"
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "channelName": "sms:userId:contactId",
  "messageId": "msg-1705318200000-abc123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (403 Forbidden):**

```json
{
  "error": "Unauthorized: Cannot publish to other users' channels",
  "requestId": "ably-pub-1705318200000-abc123"
}
```

**Supported Channel Patterns:**

- `sms:userId:contactId` - Conversation messages
- `contacts:userId` - Contact list updates
- `notifications:userId` - User notifications

**Supported Event Names:**

- `message` - SMS message
- `update` - Contact/data update
- `sms_received` - Incoming SMS notification
- `message_status` - Message delivery status
- `phone_number_assignment` - Phone number assignment

---

### 3. Get Statistics (`ably-stats`)

**Endpoint:** `GET /api/ably/stats?channelName=<optional>`

**Purpose:** Monitor Ably connection health and channel statistics

**Request Headers:**

```http
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK - Healthy):**

```json
{
  "status": "healthy",
  "server": {
    "initialized": true,
    "connectionState": "connected",
    "uptime": 3600
  },
  "channels": {
    "sms:user_123:contact_456": {
      "name": "sms:user_123:contact_456",
      "state": "attached"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": "45ms"
}
```

**Status Values:**

- `healthy` - Ably connected and ready
- `degraded` - Ably connecting or temporarily disconnected
- `unhealthy` - Ably not available

---

## 🔐 Authentication

All Ably functions require JWT authentication via the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The JWT payload must contain:

```json
{
  "userId": "user_123",
  "role": "admin",
  "iat": 1705318200,
  "exp": 1705404600
}
```

### Generate JWT Token

Use the existing login endpoint:

```bash
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

Response includes `token` in the response body.

---

## 💻 Usage Examples

### JavaScript/TypeScript Client

```typescript
import ablyService from "@/services/ablyService";

// 1. Connect to Ably with token from auth
const token = localStorage.getItem("token");
const connected = await ablyService.connect(token);

// 2. Subscribe to messages
const unsubscribe = ablyService.subscribeToConversation(
  contactId,
  userId,
  (message) => {
    console.log("New message:", message);
  },
);

// 3. Subscribe to contact updates
const unsubscribeContacts = ablyService.subscribeToContactUpdates(
  userId,
  (data) => {
    console.log("Contacts updated:", data);
  },
);

// 4. Cleanup
unsubscribe();
unsubscribeContacts();
ablyService.disconnect();
```

### Server-Side Publishing

```typescript
import ablyServer from '@/server/ably';

// Publish message
await ablyServer.publishMessage(userId, contactId, {
  contactId,
  userId,
  phoneNumberId,
  message: 'Hello!',
  direction: 'inbound',
  timestamp: new Date().toISOString(),
  from: '+1234567890',
  to: '+0987654321'
});

// Publish contact update
await ablyServer.broadcastContactUpdate(userId, {
  action: 'update',
  contact: { ... }
});

// Publish phone assignment
await ablyServer.publishPhoneNumberAssignment(userId, {
  phoneNumberId,
  phoneNumber: '+1234567890',
  action: 'assigned'
});
```

### Direct API Calls

```typescript
// Get Ably token
const tokenResponse = await fetch('/api/ably/token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { token: ablyToken } = await tokenResponse.json();

// Publish message via API
const publishResponse = await fetch('/api/ably/publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channelName: `sms:${userId}:${contactId}`,
    eventName: 'message',
    data: { ... }
  })
});

// Check health
const healthResponse = await fetch('/api/ably/stats', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { status } = await healthResponse.json();
```

---

## 📊 Monitoring

### Health Check

```bash
# Check Ably integration health
curl -X GET https://api.example.com/api/ably/stats \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### View Function Logs

```bash
# Netlify
netlify logs functions

# Or in Netlify dashboard
# Functions → Logs
```

### Key Metrics

- **Response Time:** Target < 100ms
- **Success Rate:** Target 99.9%+
- **Connection State:** Monitor via `/api/ably/stats`
- **Error Rate:** Monitor via Netlify logs

---

## ✅ Best Practices

### Security

1. **Always validate JWT tokens**
   - Verify signature
   - Check expiration
   - Validate user ID matches channel

2. **Use HTTPS in production**
   - All API calls should be encrypted
   - Netlify enforces HTTPS automatically

3. **Implement rate limiting**
   - Per-user message rate limits
   - Prevent publish storms

4. **Sanitize channel names**
   - Only allow expected patterns
   - Prevent injection attacks

### Performance

1. **Connection Reuse**
   - Ably SDK maintains persistent connections
   - Avoid reconnecting on every request

2. **Batch Operations**
   - Publish multiple messages efficiently
   - Reduce function invocations

3. **Cache Tokens**
   - Store tokens in client localStorage
   - Refresh on expiration (default 1 hour)

### Reliability

1. **Implement Retry Logic**

   ```typescript
   async function publishWithRetry(channelName, eventName, data, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await ablyServer.publishMessage(...);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
       }
     }
   }
   ```

2. **Monitor for Degradation**
   - Check `/api/ably/stats` periodically
   - Alert if status != "healthy"

3. **Graceful Fallback**
   - API still works without real-time updates
   - Users can refresh manually

---

## 🐛 Troubleshooting

### Issue: "ABLY_API_KEY environment variable not configured"

**Solution:** Set `ABLY_API_KEY` in Netlify environment variables

```bash
netlify env:set ABLY_API_KEY your_api_key
```

### Issue: "Token verification failed"

**Solution:** Ensure JWT token is valid and not expired

```bash
# Check token expiration
jwt decode <token>
```

### Issue: "Unauthorized: Cannot publish to other users' channels"

**Solution:** Channel name must match authenticated user ID

```
✓ sms:user_123:contact_456  (user_123 publishing to their channel)
✗ sms:user_999:contact_456  (user_123 publishing to other user's channel)
```

### Issue: Connection state is "connecting" or "disconnected"

**Solution:** Ably may be temporarily disconnected. The client will auto-reconnect.

```typescript
// Check connection status
const stats = await fetch("/api/ably/stats", {
  headers: { Authorization: `Bearer ${token}` },
});

const { status, server } = await stats.json();
console.log(`Ably status: ${status}`);
console.log(`Connection: ${server.connectionState}`);
```

### Issue: High latency or timeouts

**Solution:** Functions have 10s timeout. Check logs for details:

```bash
netlify logs functions | grep "ably-" | tail -50
```

---

## 📚 Additional Resources

- **Ably Documentation:** https://ably.com/documentation
- **Ably REST API:** https://ably.com/documentation/rest-api
- **Netlify Functions:** https://docs.netlify.com/functions/overview/
- **JWT.io:** https://jwt.io (token debugging)

---

## 🔄 Migration from Socket.IO

If migrating from Socket.IO:

1. **Client-side:** Already handled by `client/services/ablyService.ts`
2. **Server publishing:** Use `ablyServer` methods instead of Socket.IO emit
3. **Channels:** Map Socket.IO rooms to Ably channel patterns
4. **Events:** Ensure event names match supported list

### Socket.IO → Ably Mapping

| Socket.IO                                   | Ably Channel        | Ably Event |
| ------------------------------------------- | ------------------- | ---------- |
| `io.to('user:123').emit('new_message')`     | `sms:123:contactId` | `message`  |
| `io.to('user:123').emit('contact_updated')` | `contacts:123`      | `update`   |
| `socket.emit('join_phone_number')`          | N/A (automatic)     | N/A        |

---

## 📝 License & Support

For issues or questions:

1. Check this guide's troubleshooting section
2. Review function logs via `netlify logs`
3. Contact Ably support: support@ably.com

---

**Last Updated:** January 2024
**Version:** 1.0.0
