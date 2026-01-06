# 🚀 Netlify Production Deployment - Action Items

## Status: ✅ READY FOR DEPLOYMENT (with required actions below)

Your application has been thoroughly audited and is **production-ready**. Complete these 3 critical action items before deploying to production.

---

## 🔴 ACTION #1: Set JWT_SECRET in Netlify (CRITICAL)

**Time**: 2 minutes  
**Impact**: WITHOUT THIS, AUTHENTICATION WILL BREAK

### Steps:

1. Go to: https://app.netlify.com
2. Select your site: **conneclify**
3. Click: **Site Settings** (top menu)
4. Click: **Build & Deploy**
5. Click: **Environment**
6. Click: **Edit variables** button

7. Add new variable:
   - **Key**: `JWT_SECRET`
   - **Value**: Generate strong random key with this command:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Copy the output and paste it as the Value

8. Save the variable

9. Your environment should now have:
   ```
   MONGODB_URI = ••••••••••••••••••••••••••••••• (should already be set)
   JWT_SECRET = ••••••••••••••••••••••••••••••• (just added)
   ABLY_API_KEY = •••••••••••••••••••••••••••••• (should already be set)
   ```

✅ **Verification**: All 3 should show as hidden (●●●●●●●●●●●●)

---

## 🔴 ACTION #2: Verify MongoDB URI (CRITICAL)

**Time**: 1 minute  
**Impact**: Database won't connect without this

### Steps:

1. In same Environment section as above
2. Check that **MONGODB_URI** is set and visible
3. The value should start with: `mongodb+srv://`

✅ **Verification**: Should see the value is properly set

---

## 🔴 ACTION #3: Verify Ably API Key (CRITICAL)

**Time**: 1 minute  
**Impact**: Real-time messaging won't work without this

### Steps:

1. In same Environment section
2. Check that **ABLY_API_KEY** is set
3. Should start with: `eVcgxA.vhqQCg:`

✅ **Verification**: Should show the value is set

---

## 🟢 What's Already Done

✅ **Code Fixed**: JWT_SECRET now fails hard if not set  
✅ **Configuration**: netlify.toml is perfect  
✅ **Functions**: All serverless functions are production-grade  
✅ **Security**: CORS, headers, and authorization working  
✅ **Error Handling**: Comprehensive error handling throughout  
✅ **Database**: Circuit breaker pattern implemented  
✅ **Real-time**: Ably integration is secure and well-designed

---

## 📋 Deployment Checklist

After setting the environment variables, follow this checklist:

### Before Push

- [ ] All 3 environment variables set in Netlify
- [ ] Run locally to verify: `npm run build` (should succeed)
- [ ] Run tests: `npm test` (should pass)

### After Git Push

- [ ] Wait for Netlify to build and deploy (check https://app.netlify.app)
- [ ] Once deployed, test these endpoints:

**1. Health Check**:

```bash
curl https://conneclify.netlify.app/api/health
```

Should return: `{"status":"healthy",...}`

**2. Authentication Test**:

- Go to https://conneclify.netlify.app/signup
- Create a test account
- Verify you can log in
- Verify you can access /admin/bought-numbers

**3. SMS Test**:

- Buy a test phone number (or use existing)
- Send yourself a test SMS
- Verify it appears in app within 2 seconds

**4. Real-time Test**:

- Open app in 2 browser tabs
- In one tab, go to Messages
- In other tab, send a test SMS (using Twilio)
- Verify message appears instantly in both tabs

---

## 📊 Deployment Timeline

```
Step 1: Set Environment Variables    → 2 minutes
Step 2: Git Push Code                → 1 minute
Step 3: Netlify Build & Deploy       → 2-3 minutes
Step 4: Verification Tests           → 5 minutes
────────────────────────────────────────────────
Total Time: ~10-15 minutes
```

---

## ⚠️ What NOT To Do

❌ Don't change `netlify.toml` unless you know what you're doing  
❌ Don't delete any files in `netlify/functions/`  
❌ Don't modify `server/db.ts` circuit breaker logic  
❌ Don't commit secrets to git (use Netlify env vars only)

---

## 🆘 Troubleshooting

### If deployment fails with "JWT_SECRET not set"

**Solution**:

1. Go back to Netlify environment variables
2. Confirm JWT_SECRET is actually set
3. Click "Redeploy" on the failed build
4. Wait for new build

### If login returns "Unauthorized"

**Solution**:

1. Check Netlify logs: https://app.netlify.com/sites/conneclify/functions
2. Look for "[JWT] JWT_SECRET" error messages
3. If you see this, the env var didn't reload properly
4. Try: Trigger a new deploy from Netlify UI

### If database connection fails

**Solution**:

1. Verify MONGODB_URI in Netlify env vars
2. Check MongoDB is running and accessible
3. Monitor endpoint: `/api/health` should show connection status

### If real-time messages don't work

**Solution**:

1. Check Ably status: `/api/ably/stats` (with auth token)
2. Verify ABLY_API_KEY is set
3. Check browser console for errors
4. Verify WebSocket connections aren't blocked by firewall

---

## ✅ After Deployment

Once deployed and verified working:

1. **Monitor**: Check https://app.netlify.com/sites/conneclify/functions for the next hour
2. **Share**: https://conneclify.netlify.app is your production URL
3. **Update DNS**: If you have a custom domain, point it to Netlify
4. **Set up Alerts**: Create Netlify alerts for function errors

---

## 📞 Support

**Netlify Logs**: https://app.netlify.com/sites/conneclify/functions  
**Netlify Status**: https://www.netlify.com/status/  
**Documentation**: Check NETLIFY_PRODUCTION_AUDIT_2025.md for detailed info

---

**You're Ready! Let's Deploy! 🚀**

Once you complete these 3 actions, your application will be in production.

Questions? Check the detailed audit report: `NETLIFY_PRODUCTION_AUDIT_2025.md`
