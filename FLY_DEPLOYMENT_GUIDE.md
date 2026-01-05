# Fly.io Deployment Guide - Real-Time SMS Application

## Prerequisites

- [ ] Fly.io account created (https://fly.io)
- [ ] Fly CLI installed (`curl -L https://fly.io/install.sh | sh`)
- [ ] MongoDB connection string ready
- [ ] JWT secret ready
- [ ] Twilio credentials configured
- [ ] Git repo with all code pushed

## Step 1: Login to Fly.io

```bash
fly auth login
```

## Step 2: Create Fly.io App

If you haven't created the app yet:

```bash
fly apps create smshub
```

Or if the app already exists, just ensure you're in the project directory.

## Step 3: Set Environment Variables

Set all required environment variables:

```bash
# MongoDB connection
fly secrets set MONGODB_URI="mongodb+srv://user:pass@cluster..."

# JWT secret
fly secrets set JWT_SECRET="your-super-secret-key-here"

# Twilio credentials
fly secrets set TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxx"
fly secrets set TWILIO_AUTH_TOKEN="your-auth-token"
fly secrets set TWILIO_PHONE_NUMBER="+1234567890"

# Production domain (set after first deploy)
fly secrets set PRODUCTION_DOMAIN="smshub-abc123.fly.dev"

# Node environment
fly secrets set NODE_ENV="production"
```

View your app's domain after first deploy:

```bash
fly info
# Look for the "Hostname" field
```

Then set PRODUCTION_DOMAIN:

```bash
fly secrets set PRODUCTION_DOMAIN="your-actual-fly-domain.fly.dev"
```

## Step 4: Configure Regions (Optional)

To deploy to a specific region:

```bash
# Deploy to a specific region
fly deploy --region iad  # Washington DC

# View available regions
fly platform regions
```

## Step 5: Deploy

```bash
# First deployment
fly deploy

# Subsequent deployments
fly deploy

# Force rebuild (if needed)
fly deploy --build-only
```

## Step 6: Monitor Deployment

```bash
# View logs in real-time
fly logs

# View app status
fly status

# View full app info
fly info

# Scale up machines if needed
fly machines list
```

## Step 7: Verify Real-Time Messaging Works

1. Open your app: https://smshub-xxxx.fly.dev
2. Login with your credentials
3. Open Conversations page
4. Look for: **"✨ Real-time messaging connected - SMS updates in real-time!"**
5. Send a test SMS - it should appear instantly

## Testing Real-Time Messaging

### Test 1: Send Message from Same Browser

```
1. Open Conversations page
2. Select a contact
3. Type and send a message
4. Verify message appears instantly (no refresh needed)
```

### Test 2: Send Message from Another Device

```
1. Open the same conversation on another phone/browser
2. Send a message from first device
3. Second device should receive it instantly
```

### Test 3: Receive Incoming SMS

```
1. Send SMS to your Twilio number from a phone
2. App should show it instantly without refresh
```

## Common Issues & Solutions

### Issue: App crashes on startup

```bash
# Check logs
fly logs

# Common causes:
# - Missing environment variable
# - MongoDB connection failed
# - Port already in use
```

**Solution**:

```bash
# Verify all secrets are set
fly secrets list

# Redeploy with correct secrets
fly deploy
```

### Issue: Socket.io says "Connection Error"

```bash
# Check if PRODUCTION_DOMAIN is set correctly
fly secrets list | grep PRODUCTION_DOMAIN

# Should show your actual domain
```

**Solution**:

```bash
# Get your actual domain
fly info | grep Hostname

# Set it correctly
fly secrets set PRODUCTION_DOMAIN="smshub-xxxxx.fly.dev"

# Redeploy
fly deploy
```

### Issue: WebSocket connection fails

```bash
# Check if app is running
fly status

# Check recent logs
fly logs -n 100
```

**Solution**: This usually means the app crashed. Check logs and fix the issue.

### Issue: Database connection timeout

```bash
# Verify MongoDB connection string
fly secrets list | grep MONGODB_URI

# Test connection locally first:
npm run dev
# Login and test messaging before deploying
```

## Scaling Up

### Add More Machines

```bash
# By default, fly.io gives you 1 shared-cpu machine
# To add more:

fly scale count 2
```

**Important for Socket.io**: With multiple machines, add socket.io-redis:

```bash
npm install socket.io-redis
```

Then see REALTIME_SMS_SETUP.md for Redis configuration.

### Increase Machine Size

```bash
fly scale vm shared-cpu-1x  # Default
fly scale vm shared-cpu-2x  # Double resources
fly scale vm performance-1x # High performance
```

## Monitoring & Maintenance

### View Real-Time Logs

```bash
fly logs -f          # Follow logs (like tail -f)
fly logs -n 50       # Last 50 log lines
fly logs --region us # Specific region
```

### View Metrics

```bash
fly metrics
```

### Restart App

```bash
fly apps restart
# or specific machine:
fly machines restart <MACHINE_ID>
```

### SSH into Machine

```bash
fly ssh console
```

## Cost Optimization

Fly.io free tier includes:

- ✅ 3 shared-cpu-1x VMs
- ✅ 3 GB persistent storage
- ✅ 160 GB outbound data per month

**Monitor usage**:

```bash
fly account show
```

## Rollback to Previous Version

```bash
# View deployment history
fly history

# Rollback (requires saving previous image)
fly deploy --image <PREVIOUS_IMAGE_ID>
```

## Production Checklist

Before considering your app production-ready:

- [ ] All secrets set and verified
- [ ] App deploys without errors
- [ ] Real-time messaging works (socket connected)
- [ ] Can send/receive SMS without refresh
- [ ] Health check passing (`curl https://your-app/api/ping`)
- [ ] Logs show no critical errors
- [ ] Tested from multiple browsers/devices
- [ ] Database backups configured (if needed)

## Troubleshooting Deployment Issues

### App won't start

```bash
# 1. Check build logs
fly logs --instance=<instance-id>

# 2. Check if environment variables are needed
fly secrets list

# 3. Verify package.json "start" script
cat package.json | grep -A 5 '"scripts"'

# Should show: "start": "node dist/server/production.mjs"
```

### Connection refused errors

```bash
# App might be crashing on startup
fly logs

# Check if PORT env var is set
fly secrets list | grep PORT
# Should show: PORT=3000
```

### Out of memory

```bash
# Upgrade machine size
fly scale vm shared-cpu-2x

# or scale down if too expensive
fly scale count 1
```

## Useful Commands Reference

```bash
# Deployment
fly deploy              # Deploy app
fly deploy --build-only # Just build, don't deploy

# Information
fly info               # Show app info
fly status             # Show machine status
fly machines list      # List all machines
fly secrets list       # List env variables

# Logs & Monitoring
fly logs               # Show logs
fly logs -f            # Follow logs
fly metrics            # Show metrics
fly history            # Deployment history

# Management
fly scale count 2      # Scale to 2 machines
fly scale vm shared-cpu-2x # Upgrade machine size
fly apps restart       # Restart app
fly ssh console        # SSH into machine
```

## Performance Tips

1. **Enable caching**: Static assets are cached by default
2. **Use clustering**: Scale to 2-3 machines for redundancy
3. **Monitor memory**: Keep eye on memory usage in logs
4. **Optimize DB**: Index MongoDB collections by usage patterns
5. **Cleanup logs**: Old logs take storage space

## Getting Help

- Fly.io Docs: https://fly.io/docs/
- Socket.io Docs: https://socket.io/docs/
- Community: https://community.fly.io/

---

**Last Updated**: January 5, 2026
**Status**: Production Ready ✅
