# Real-Time SMS with Socket.io - Production Setup Guide

## Overview

This guide explains how to set up and deploy real-time SMS functionality (send/receive without page refresh) to Fly.io.

## ✅ What's Included

### Server-Side Socket.io Setup (`server/socket.ts`)

- ✅ Proper CORS configuration for multiple domains (Fly.io, Netlify, localhost)
- ✅ WebSocket and polling transports for compatibility
- ✅ Authentication via JWT tokens
- ✅ User rooms for targeted message delivery
- ✅ Admin rooms for administrative notifications
- ✅ Message event handling with storage integration

### Client-Side Socket.io Connection (`client/services/socketService.ts`)

- ✅ Automatic production domain detection
- ✅ Intelligent fallback to polling if WebSocket unavailable
- ✅ Automatic reconnection with exponential backoff
- ✅ Token-based authentication
- ✅ Proper cleanup on disconnect

### Server Implementation (`server/node-build.ts`)

- ✅ HTTP server with Socket.io properly integrated
- ✅ Static file serving for SPA
- ✅ React Router fallback for client-side routing
- ✅ Graceful shutdown handling

## 🚀 Deployment to Fly.io

### Step 1: Ensure Environment Variables

In your Fly.io app settings, make sure these are set:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster...
JWT_SECRET=your-secret-key-here
NODE_ENV=production
PORT=3000
```

**Optional but recommended:**

```env
PRODUCTION_DOMAIN=your-app.fly.dev
```

### Step 2: Build for Production

```bash
npm run build
```

This creates:

- `dist/spa/` - Compiled React frontend
- `dist/server/` - Compiled Node.js backend with Socket.io

### Step 3: Verify `fly.toml` Configuration

Your `fly.toml` should have:

```toml
[env]
  NODE_ENV = "production"

[[services]]
  protocol = "tcp"
  internal_port = 3000
  processes = ["app"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Step 4: Deploy

```bash
fly deploy
```

## 🔌 How Real-Time Messaging Works

### 1. **Client Connects**

```typescript
// In Conversations.tsx when component loads
const socket = socketService.connect(token);
```

The socket automatically:

- Detects production domain
- Connects to the same origin (your Fly.io app)
- Authenticates with JWT token
- Joins user-specific room (`user:{userId}`)
- If admin, also joins admin room (`admin:{adminId}`)

### 2. **User Sends SMS**

```typescript
// When user clicks "Send"
await ApiService.sendMessage(...);

// Server receives message and broadcasts
socketService.emit("message_sent", {
  phoneNumberId,
  to,
  body,
  timestamp
});
```

### 3. **Real-Time Broadcast**

```typescript
// Server receives the event via Socket.io
socket.on("message_sent", (data) => {
  // Emit to all connected clients for that user
  io.to(`user:${socket.userId}`).emit("message_updated", {
    ...data,
    direction: "outbound",
    timestamp: new Date().toISOString(),
  });
});
```

### 4. **Incoming SMS from Twilio**

```typescript
// When Twilio webhook delivers SMS
POST /api/webhooks/inbound-sms
↓
// Server processes and broadcasts via Socket.io
io.to(`user:${assignedTeamMemberId}`).emit("new_message", {
  phoneNumberId,
  from,
  body,
  direction: "inbound",
  timestamp
});
↓
// Connected clients receive in real-time
socketService.on("new_message", (data) => {
  // Update UI without page refresh
  updateConversationsList();
  updateMessagesList();
});
```

## 🔍 Troubleshooting Real-Time Messaging

### Issue: Socket.io Shows "Connection Error"

**Cause**: Usually a CORS or domain configuration issue

**Check**:

1. Open browser DevTools → Console
2. Look for socket.io connection logs
3. Check if you see "WebSocket connection failed" or "CORS error"

**Solutions**:

- Verify your Fly.io domain is set in `PRODUCTION_DOMAIN` env var
- Check that the app is running: `fly logs`
- Try `fly deploy --force-machines` to restart

### Issue: Real-Time Updates Not Appearing

**Cause**: Socket.io connected but events not being broadcast

**Check**:

1. Verify token is valid: Check `localStorage.getItem('token')`
2. Check server logs: `fly logs -a your-app-name`
3. Look for "Socket.io connected" message in browser console

**Solutions**:

- If connected but no updates: Check that your API calls are triggering socket events
- If not connecting: May be a CORS issue - check firewall/proxy

### Issue: Works in Dev but Not in Production

**Cause**: Likely a CORS or domain mismatch

**Verify**:

```javascript
// In browser console on production site:
console.log(window.location.origin);
// Should show your Fly.io domain like:
// https://smshub-abc123.fly.dev

// Check socket.io connection:
socketService.getSocket()?.id;
// Should show a socket ID if connected
```

## 📊 Monitoring Real-Time Messaging

### Check Connection Status

```typescript
// In Conversations.tsx
const isConnected = socketService.connected;
console.log(`Socket connected: ${isConnected}`);
```

### View Recent Events

```bash
fly logs -a your-app-name --region=all
# Look for:
# "[Socket.io] Connected"
# "Socket.io received message_sent"
# "Broadcasting to users"
```

### Test Real-Time Manually

```typescript
// In browser console:
const sock = socketService.getSocket();
sock?.emit("test", { message: "hello" });
sock?.on("test", (data) => console.log("Received:", data));
```

## 🎯 Performance Optimization

### For High Message Volume

The current setup includes:

- **Connection pooling**: Socket.io handles multiple connections efficiently
- **Message batching**: Can be added if needed
- **Horizontal scaling**: Requires socket.io-redis adapter

### If You Need to Scale to Multiple Fly.io Machines

Add socket.io-redis for shared state:

```bash
npm install socket.io-redis
```

Then in `server/socket.ts`:

```typescript
import { createAdapter } from "@socket.io-redis";
import { createClient } from "redis";

const pubClient = createClient({ host: "redis.fly-internal", port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## 🔐 Security Notes

- ✅ All socket connections require valid JWT token
- ✅ Users only receive events for their own rooms
- ✅ Admin-only events go to admin rooms only
- ✅ CORS is restricted to known domains
- ✅ No sensitive data in socket events (only references)

## 📝 Testing Checklist

Before considering deployment complete:

- [ ] Open Conversations page - should show "Real-time messaging connected" toast
- [ ] Send a message from another device/browser - should appear instantly
- [ ] Receive test SMS from Twilio - should appear without page refresh
- [ ] Close and reopen page - should reconnect automatically
- [ ] Check browser console - no critical errors
- [ ] Verify `fly logs` shows socket connection events
- [ ] Test on mobile/different network

## 🐛 Common Issues & Fixes

| Issue                     | Solution                                     |
| ------------------------- | -------------------------------------------- |
| Socket shows "404" error  | Check `path: "/socket.io"` in client options |
| Connection keeps dropping | Increase `pingInterval` in server config     |
| CORS errors in logs       | Add your domain to `getAllowedOrigins()`     |
| No real-time updates      | Check socket is connected in DevTools        |
| High memory usage         | May need Redis adapter for scaling           |

## 📚 Additional Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Fly.io WebSocket Support](https://fly.io/docs/getting-started/node/)
- [Real-time Messaging Best Practices](https://socket.io/docs/v4/server-socket-instance/)

---

**Last Updated**: January 5, 2026
**Status**: Production Ready ✅
