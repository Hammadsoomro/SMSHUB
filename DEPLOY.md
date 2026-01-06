# Netlify Deployment Guide for SMSHub

This guide will help you deploy SMSHub to Netlify with all features working properly.

## Prerequisites

- A Netlify account (free at [netlify.com](https://netlify.com))
- Git repository pushed to GitHub/GitLab/Bitbucket
- Environment variables ready (see below)
- MongoDB Atlas account for database

## Step 1: Prepare Environment Variables

You need the following environment variables on Netlify:

### Required Variables

1. **MONGODB_URI** (Required)
   - MongoDB connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
   - Get from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **JWT_SECRET** (Required)
   - Secret key for JWT tokens (generate a random string)
   - Minimum 32 characters
   - Example: `your-secret-key-here-make-it-very-long-and-secure`

3. **TWILIO_ACCOUNT_SID** (Optional but recommended)
   - Your Twilio Account SID
   - Get from [Twilio Console](https://console.twilio.com)

4. **TWILIO_AUTH_TOKEN** (Optional but recommended)
   - Your Twilio Auth Token
   - Get from [Twilio Console](https://console.twilio.com)

### Generate JWT Secret (Recommended Way)

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Step 2: Connect Git Repository to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"New site from Git"**
3. Choose your Git provider (GitHub, GitLab, or Bitbucket)
4. Authorize Netlify to access your repositories
5. Select your repository
6. Choose branch to deploy (usually `main`)
7. Keep the build settings (they're already in `netlify.toml`)

## Step 3: Configure Environment Variables

1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Click **"Edit variables"** or **"Add environment variable"**
3. Add the variables from Step 1:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your generated secret
   - `TWILIO_ACCOUNT_SID`: (Optional) Your Twilio SID
   - `TWILIO_AUTH_TOKEN`: (Optional) Your Twilio token

⚠️ **Important**: Do NOT commit `.env` files to Git. Environment variables should only be set in Netlify.

## Step 4: Verify Build Settings

Check that your build settings are correct:

- **Build command**: `npm run build:client`
- **Publish directory**: `dist/spa`
- **Functions directory**: `netlify/functions`

These should already be configured in `netlify.toml`, but verify they're correct:

```toml
[build]
  command = "npm run build:client"
  functions = "netlify/functions"
  publish = "dist/spa"
  node_version = "22"
```

## Step 5: Deploy

Once environment variables are set:

1. Netlify will automatically deploy when you push to your branch
2. You can also manually trigger a deploy from Netlify dashboard
3. Check deployment logs if there are any issues
4. Your site will be live at `https://your-site-name.netlify.app`

## Step 6: Set Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add domain"**
3. Enter your custom domain
4. Follow DNS configuration instructions

## Step 7: Test Your Deployment

After deployment, test these features:

### ✅ Authentication

- [ ] Sign up with a new account
- [ ] Login with email/password
- [ ] See user profile

### ✅ Credentials

- [ ] Navigate to Credentials page
- [ ] Save Twilio credentials (if you have them)
- [ ] Credentials are stored securely

### ✅ Real-time Connection

- [ ] Check browser console for socket connection
- [ ] You should see "Connected" toast notification
- [ ] Real-time messaging works

### ✅ Messaging (if credentials set)

- [ ] View contacts
- [ ] Send messages
- [ ] Receive messages (if Twilio webhook configured)
- [ ] See real-time updates

### ✅ Dark/Light Theme

- [ ] Toggle between light and dark themes
- [ ] Theme persists on refresh

### ✅ Navigation

- [ ] All navbar buttons work
- [ ] Back button navigates correctly
- [ ] Dashboard button goes to `/admin`

## Troubleshooting

### Build Failures

**Error: "npm: command not found"**

- Netlify uses pnpm by default. Add this to build settings:
- Or update your `package.json` `engines` field

**Error: "MONGODB_URI is undefined"**

- Check environment variables in Netlify dashboard
- Make sure variable names match exactly (case-sensitive)
- Redeploy after adding variables

**Error: "Build exceeded timeout"**

- Check build logs for bottlenecks
- Try clearing Netlify cache (Site settings → Build & deploy → Clear cache)

### Runtime Issues

**Socket.IO Connection Fails**

- Check browser console for errors
- Verify environment variables are set correctly
- Make sure MongoDB connection is working

**Cannot Save Credentials**

- Check that MongoDB is connected
- Verify JWT_SECRET is set
- Check browser console for API errors

**Messages Not Sending**

- If using Twilio, verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- Check Twilio account has SMS credits
- Verify phone number format (must be international format, e.g., +1234567890)

**Dark Mode Not Working**

- Clear browser cache
- Check that sonner toast library is loaded
- Verify theme CSS is being applied

## Monitoring & Logs

### View Deploy Logs

1. Go to Netlify dashboard
2. Click on your site
3. Go to **Deploys**
4. Click on latest deploy
5. Scroll down to see build logs

### Monitor Site Status

1. Go to **Monitoring** → **Overview**
2. Check uptime status
3. View error rates
4. Check response times

### Enable Error Tracking (Optional)

1. Go to **Analytics** → **Data**
2. Monitor visitor activity
3. Track performance metrics

## Advanced Configuration

### Custom Build Command

If you need to run a custom build:

```bash
# Add to netlify.toml
[build]
  command = "pnpm install && npm run build:client"
```

### Increase Memory

If you get memory issues:

```bash
# In Netlify UI, set environment variable:
NODE_OPTIONS = --max-old-space-size=3072
```

### Redirect HTTP to HTTPS

Add to `netlify.toml`:

```toml
[[redirects]]
  from = "http/*"
  to = "https://:splat"
  status = 301
  force = true
```

## Production Checklist

Before going to production:

- [ ] All environment variables are set
- [ ] MongoDB connection is working
- [ ] JWT_SECRET is strong and secure
- [ ] SSL/TLS certificate is installed (automatic on Netlify)
- [ ] Domain is configured
- [ ] Backup strategy is in place
- [ ] Error monitoring is enabled
- [ ] All features have been tested
- [ ] Mobile responsiveness is verified

## Useful Commands

```bash
# Test build locally
npm run build

# Start production server locally
npm run start

# Build and deploy
git push origin main  # Netlify automatically deploys

# Check environment variables
# Go to Netlify dashboard → Site settings → Build & deploy → Environment
```

## Getting Help

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Community](https://community.netlify.com/)
- Check `/code` folder for detailed component documentation
- Review `AGENTS.md` for architecture notes

## SSL/TLS Security

Netlify automatically provides:

- ✅ Free SSL certificate (automatic)
- ✅ Automatic renewal
- ✅ HSTS headers
- ✅ DDoS protection

Your site is automatically secure!

## Backup & Recovery

### MongoDB Backup

1. Enable automatic backups in MongoDB Atlas
2. Set backup frequency to daily
3. Keep at least 7 days of backups

### Code Backup

1. Git repository is your backup
2. Keep production branch safe
3. Use git tags for releases

### Data Recovery

1. Restore from MongoDB backups if needed
2. Check Netlify deploy history for code rollback
3. Use git to revert commits if needed

---

**Your SMSHub is now live! 🚀**

For updates and improvements, just push to your Git repository and Netlify will automatically redeploy.
