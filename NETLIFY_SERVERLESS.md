# Netlify Serverless Deployment Guide

This application is fully configured to run on **Netlify Functions** as a serverless architecture. This guide explains the setup, deployment, and optimization strategies.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Configuration](#configuration)
- [Deployment Steps](#deployment-steps)
- [Environment Variables](#environment-variables)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Optimization & Best Practices](#optimization--best-practices)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

### Current Setup

The application has been converted from a traditional Node.js/Express server to a serverless architecture:

```
┌─────────────────────────────────────────────────────┐
│              Browser / Client App                    │
└────────────────┬────────────────────────────────────┘
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────────┐
│            Netlify CDN & Routing                     │
│  - Serves static SPA assets (dist/spa)              │
│  - Routes /api/* to serverless functions            │
└────────────────┬────────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  api.ts Handler  │  │ health.ts Handler│
│  (Main API)      │  │ (Health Check)   │
└────────┬─────────┘  └──────────────────┘
         │
         ├─► Express Server (cached)
         │   ├─► Auth Routes
         │   ├─► Admin Routes
         │   ├─► Message Routes
         │   ├─► Phone Purchase
         │   └─► Webhooks
         │
         └─► MongoDB Atlas
             (Shared Connection Pool)
```

### Files Structure

```
netlify/
├── functions/
│   ├── api.ts              # Main serverless handler (all API routes)
│   └── health.ts           # Health check endpoint
├── functions-utils/        # Optional utility functions

server/
├── index.ts                # Express app setup
├── db.ts                   # MongoDB connection (serverless optimized)
├── middleware/             # Auth, Twilio validation
├── routes/                 # All API endpoints
├── models/                 # Mongoose schemas
├── storage.ts              # Database operations
├── utils/
│   └── serverless.ts       # Serverless utilities & caching
└── ...

netlify.toml               # Netlify configuration (UPDATED)
```

## Configuration

### netlify.toml Setup

The `netlify.toml` file is configured for optimal serverless performance:

```toml
[build]
  command = "npm run build:client"
  functions = "netlify/functions"
  publish = "dist/spa"
  node_version = "22"

[functions]
  external_node_modules = ["express", "cors", "mongoose", ...]
  node_bundler = "esbuild"

[[functions]]
  name = "api"
  timeout = 30          # 30 seconds (max for Netlify Pro)
  memory = 1024         # 1GB memory for database operations

[[functions]]
  name = "health"
  timeout = 5           # Quick health checks

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
```

### Key Features

1. **Connection Caching**: Express app instance is cached and reused across invocations
2. **Database Pooling**: MongoDB connection pool configured for serverless
3. **Performance Monitoring**: Built-in metrics for request tracking
4. **Health Checks**: Dedicated endpoint for monitoring
5. **Security Headers**: Automatic security headers on all responses
6. **Error Handling**: Comprehensive error handling with proper HTTP status codes

## Deployment Steps

### 1. Connect Repository to Netlify

```bash
# Push code to GitHub/GitLab
git push origin main
```

Then in Netlify dashboard:

- Click "New site from Git"
- Select your repository
- Configure build settings
- Netlify will auto-detect `netlify.toml`

### 2. Set Environment Variables

In Netlify dashboard → Site Settings → Environment:

```
MONGODB_URI = your_mongodb_atlas_connection_string
NODE_ENV = production
TWILIO_ACCOUNT_SID = your_twilio_sid
TWILIO_AUTH_TOKEN = your_twilio_token
JWT_SECRET = your_jwt_secret
PING_MESSAGE = optional_ping_message
```

### 3. Deploy

```bash
# Automatic deployment on push
git push origin main

# Or manual deployment
netlify deploy --prod
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl https://your-site.netlify.app/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-04T...",
#   "checks": {
#     "database": "connected",
#     "environment": "production"
#   }
# }
```

## Environment Variables

### Required Variables

| Variable             | Description               | Example                                          |
| -------------------- | ------------------------- | ------------------------------------------------ |
| `MONGODB_URI`        | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET`         | Secret for JWT tokens     | Any secure random string                         |
| `TWILIO_ACCOUNT_SID` | Twilio SID                | `ACxxxxxxxxxx`                                   |
| `TWILIO_AUTH_TOKEN`  | Twilio Auth Token         | Secure token from Twilio                         |

### Optional Variables

| Variable       | Description            | Default      |
| -------------- | ---------------------- | ------------ |
| `NODE_ENV`     | Environment            | `production` |
| `PING_MESSAGE` | Ping endpoint response | `ping`       |
| `NETLIFY_ENV`  | Netlify environment    | Auto-set     |

### Setting Variables

```bash
# Via Netlify CLI
netlify env:set MONGODB_URI "mongodb+srv://..."
netlify env:set JWT_SECRET "your_secret"

# Via Netlify Dashboard
# Settings → Environment → Environment variables
```

## Monitoring & Health Checks

### Health Check Endpoint

```bash
# Get current health status
GET /api/health

# Response when healthy:
{
  "status": "healthy",
  "timestamp": "2024-01-04T10:30:00Z",
  "uptime": 3600,
  "checks": {
    "environment": "production",
    "database": "connected"
  },
  "responseTime": "45ms"
}

# Response when degraded:
{
  "status": "degraded",
  "timestamp": "2024-01-04T10:30:00Z",
  "checks": {
    "environment": "production",
    "database": "disconnected"
  }
}
```

### Set Up Monitoring

1. **Netlify Analytics**
   - View function execution time and memory usage
   - Monitor cold starts and invocations

2. **External Monitoring**

   ```bash
   # Uptime monitoring service (e.g., Pingdom, UptimeRobot)
   # Configure to ping /api/health every 5 minutes
   ```

3. **Log Aggregation**
   - Netlify automatically captures function logs
   - View in Netlify dashboard → Functions → Logs

### Performance Metrics

The application tracks performance metrics per request:

```bash
# View performance logs
netlify functions:invoke api --querystring 'path=/api/admin/dashboard/stats'

# Logs include:
# - Request method and path
# - Status code
# - Response time
# - Database query duration
```

## Optimization & Best Practices

### 1. Connection Management

**MongoDB Connection Pooling**

```typescript
// Automatically configured in server/db.ts
// Reuses connections across warm invocations
// Pool size: 2-10 connections (optimized for serverless)
```

**Impact**:

- Cold start: ~2-3 seconds (first connection)
- Warm start: ~100-200ms (reused connection)

### 2. Memory Allocation

Current configuration: **1024 MB** for API function

```toml
[[functions]]
  name = "api"
  memory = 1024  # Sufficient for Node.js + MongoDB driver
```

Recommendations:

- Small workloads: 512 MB
- Medium workloads: 1024 MB (current)
- Large workloads: 2048 MB (Netlify Pro only)

### 3. Function Timeout

Current configuration: **30 seconds** for API

```toml
[[functions]]
  name = "api"
  timeout = 30  # Netlify Pro allows 30s
```

For optimal performance:

- Target response time: < 5 seconds
- Database queries: < 10 seconds
- File uploads: < 15 seconds

### 4. Cold Start Optimization

Strategies to reduce cold start time:

1. **Bundler Configuration**
   - Uses esbuild (fast compilation)
   - Includes only necessary modules

2. **Connection Reuse**
   - Express app cached in function closure
   - MongoDB connection pooled

3. **Code Splitting**
   - Heavy operations in separate Lambda functions
   - Middleware layering

### 5. Caching Strategy

Built-in in-memory caching:

```typescript
import { cache } from "../server/utils/serverless";

// Set cache
cache.set("user_123", userData, 300); // 5 minute TTL

// Get cache
const cached = cache.get("user_123");

// Clear cache
cache.delete("user_123");
cache.clear(); // Clear all
```

**Good Use Cases**:

- Frequently accessed settings
- Static data (phone number prefixes)
- User session info

**Avoid Caching**:

- Real-time data
- User authentication tokens
- Sensitive information

### 6. Database Query Optimization

```typescript
// ✅ Good: Specific query with index
const user = await UserModel.findById(userId);

// ✅ Good: Lean queries for read-only
const users = await UserModel.find({}).lean();

// ❌ Bad: No index, full scan
const user = await UserModel.findOne({ customField: value });

// ❌ Bad: Multiple sequential queries
for (const id of ids) {
  const item = await ItemModel.findById(id);
}

// ✅ Better: Batch query
const items = await ItemModel.find({ _id: { $in: ids } });
```

## Troubleshooting

### Cold Start Issues

**Problem**: First request takes 2-3 seconds

**Solutions**:

1. Increase memory allocation (netlify.toml)
2. Use Netlify Pro for more memory/CPU
3. Keep dependencies minimal
4. Monitor cold starts in Netlify dashboard

### Database Connection Timeout

**Problem**: "MongoDB connection failed" error

**Solutions**:

```typescript
// Check connection status
GET /api/health

// Verify environment variables
netlify env:list

// Check MongoDB Atlas
// - IP whitelist includes Netlify IPs (0.0.0.0/0 for testing)
// - Connection string is correct
// - Database user has proper permissions
```

### Memory Issues

**Problem**: Function runs out of memory

**Solutions**:

1. Increase memory: `memory = 1024` in netlify.toml
2. Optimize queries (add indexes)
3. Reduce batch sizes
4. Stream large responses

### Function Timeout

**Problem**: "Function timeout" error after 30 seconds

**Solutions**:

1. Optimize database queries
2. Add caching to reduce queries
3. Increase timeout (if on Pro plan)
4. Split into multiple functions

### CORS Issues

**Problem**: "CORS error" from client

**Solutions**:

1. Already configured in Express app
2. Verify Netlify redirect rules
3. Check browser console for actual error

### Logs & Debugging

```bash
# View function logs
netlify functions:invoke api --querystring 'path=/api/ping'

# Stream logs
netlify logs --tail

# Deploy logs
netlify deploy --prod --verbose
```

## Production Checklist

- [ ] All environment variables set
- [ ] MongoDB connection verified
- [ ] Health check returning 200
- [ ] SSL certificate active
- [ ] Domain configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy for MongoDB
- [ ] Error tracking configured (optional)
- [ ] CDN cache headers configured
- [ ] Rate limiting configured (optional)

## Next Steps

1. **Monitoring**: Set up error tracking (Sentry, Rollbar)
2. **Analytics**: Track API usage and performance
3. **Caching**: Implement edge caching for CDN
4. **Scaling**: Use database read replicas for high traffic
5. **Automation**: Set up CI/CD pipelines

## Support & Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Limits & Pricing](https://www.netlify.com/pricing/)
- [MongoDB Atlas Serverless](https://www.mongodb.com/docs/atlas/manage-connections/serverless/)
- [Express.js Guide](https://expressjs.com/)

---

**Last Updated**: January 2024
**Deployment Status**: Production Ready ✅
