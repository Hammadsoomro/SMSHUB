# SMSHub Deployment Checklist

Use this checklist to ensure everything is ready before deploying to production.

## Code Quality

- [ ] No `console.log()` statements in production code
- [ ] No TODO or FIXME comments left in critical code
- [ ] All error handling is proper (try-catch blocks)
- [ ] No hardcoded URLs or API endpoints
- [ ] No hardcoded credentials or secrets
- [ ] Code is formatted with Prettier
- [ ] No TypeScript errors (`npm run typecheck`)

## Environment Variables

- [ ] `MONGODB_URI` is set in Netlify
- [ ] `JWT_SECRET` is set in Netlify (strong, random string)
- [ ] `TWILIO_ACCOUNT_SID` is set (if using SMS)
- [ ] `TWILIO_AUTH_TOKEN` is set (if using SMS)
- [ ] `.env` file is in `.gitignore`
- [ ] `.env.example` file is committed (without secrets)
- [ ] No environment variables are committed to Git
- [ ] All variables have been tested locally before deployment

## Database

- [ ] MongoDB Atlas account is created
- [ ] Database connection string is valid
- [ ] Database has all required collections
- [ ] Database backups are enabled
- [ ] Connection pooling is configured (MongoDB Atlas default: 5 connections)
- [ ] MongoDB firewall allows Netlify IP addresses
  - **Important**: In MongoDB Atlas, go to Network Access and add `0.0.0.0/0` or Netlify's IP range

## Security

- [ ] HTTPS is enabled (automatic on Netlify)
- [ ] JWT_SECRET is strong (32+ characters, random)
- [ ] CORS is properly configured
- [ ] No sensitive data is logged
- [ ] Authentication middleware is in place
- [ ] Password hashing is implemented
- [ ] API endpoints are protected with authMiddleware
- [ ] Admin-only endpoints use adminOnly middleware

## Features

### Authentication

- [ ] Sign up works
- [ ] Login works
- [ ] JWT tokens are generated
- [ ] Token expiration works
- [ ] Logout clears tokens

### Real-time Messaging

- [ ] Socket.IO connection works
- [ ] Connection/disconnection toasts show
- [ ] Messages update in real-time
- [ ] No console errors on socket events

### Theme

- [ ] Light theme is default
- [ ] Theme toggle works
- [ ] Theme persists on refresh
- [ ] Dark mode CSS is applied correctly

### Navigation

- [ ] All navbar buttons work
- [ ] Back button navigates correctly
- [ ] Dashboard button goes to `/admin`
- [ ] All routes are accessible

### Messaging (if SMS enabled)

- [ ] Twilio credentials can be saved
- [ ] Contacts can be added/edited/deleted
- [ ] Messages can be sent
- [ ] Message list updates
- [ ] Unread count is correct

## Performance

- [ ] Build size is reasonable (<500KB gzip for client)
- [ ] Page load time is acceptable (<3 seconds)
- [ ] No unnecessary re-renders
- [ ] Images are optimized
- [ ] Code splitting is working

## Accessibility

- [ ] Keyboard navigation works
- [ ] Color contrast is sufficient
- [ ] ARIA labels are present
- [ ] Focus indicators are visible
- [ ] Forms are properly labeled

## Browser Compatibility

- [ ] Chrome/Chromium works
- [ ] Firefox works
- [ ] Safari works
- [ ] Edge works
- [ ] Mobile browsers work

## Mobile Responsiveness

- [ ] Layout adapts to mobile (320px)
- [ ] Buttons are touch-friendly (minimum 44x44px)
- [ ] Sidebar works on mobile
- [ ] Images are responsive
- [ ] No horizontal scroll needed

## Monitoring & Analytics

- [ ] Error monitoring is set up (optional)
- [ ] Analytics are configured (optional)
- [ ] Performance monitoring is enabled
- [ ] You know how to check logs

## Documentation

- [ ] README.md is up to date
- [ ] DEPLOY.md is comprehensive
- [ ] QUICKSTART.md has correct instructions
- [ ] .env.example shows all required variables
- [ ] Code comments explain complex logic
- [ ] API endpoints are documented

## Final Steps

### Before Pushing to Production

1. **Test locally**

   ```bash
   npm run build
   npm run start
   ```

   - Visit http://localhost:3000
   - Test all major features
   - Check browser console for errors

2. **Run type check**

   ```bash
   npm run typecheck
   ```

   - Should have 0 errors

3. **Review recent changes**

   ```bash
   git log --oneline -10
   ```

   - Verify all commits are intentional

4. **Check environment variables**
   - Verify in Netlify dashboard that all variables are set
   - Never commit .env files

### After Deployment

1. **Verify deployment**
   - [ ] Site loads without errors
   - [ ] Check Netlify deploy logs for warnings
   - [ ] Check browser console (F12) for errors
   - [ ] Test major features on live site

2. **Monitor first 24 hours**
   - [ ] Check Netlify Analytics
   - [ ] Monitor error rates
   - [ ] Check response times
   - [ ] Review server logs

3. **Post-deployment**
   - [ ] Document any deployment issues
   - [ ] Update deployment runbook
   - [ ] Notify team of deployment
   - [ ] Plan follow-up improvements

## Common Issues & Solutions

| Issue                   | Solution                                                |
| ----------------------- | ------------------------------------------------------- |
| Build fails             | Check `npm run build` locally, review Netlify logs      |
| 502 Bad Gateway         | Verify MongoDB connection, check Netlify functions logs |
| Messages not sending    | Verify Twilio credentials, check API logs               |
| Socket connection fails | Check browser console, verify server is running         |
| Theme not persisting    | Clear browser cache, check localStorage                 |
| API returns 401         | Verify JWT_SECRET, check token in localStorage          |

## Rollback Plan

If something goes wrong:

1. **Quick Rollback**
   - Go to Netlify → Deploys
   - Click on previous successful deploy
   - Click "Publish deploy"
   - Site is back to previous version

2. **Code Rollback**

   ```bash
   git revert <commit-hash>
   git push
   ```

   - Netlify automatically redeploys

3. **Database Rollback**
   - Restore from MongoDB Atlas backup
   - Contact support if needed

## Performance Checklist

- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2 seconds
- [ ] Largest Contentful Paint < 2.5 seconds
- [ ] Cumulative Layout Shift < 0.1
- [ ] Client-side JavaScript < 500KB gzip
- [ ] No unused dependencies

## Security Audit

Run a quick security check:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

- [ ] No high or critical vulnerabilities
- [ ] No secrets in Git history
- [ ] No hardcoded API keys
- [ ] CORS properly configured
- [ ] Rate limiting considered

## Sign-off

Before deployment, confirm:

- [ ] Lead developer has reviewed all changes
- [ ] All tests pass locally
- [ ] No breaking changes
- [ ] Documentation is updated
- [ ] Stakeholders are notified
- [ ] Backup plan is in place

---

## Deployment Command

Once everything is checked off:

```bash
# Push to main branch (triggers automatic deployment)
git push origin main
```

Netlify will automatically deploy when you push to your configured branch.

**Estimated deployment time**: 2-3 minutes

---

**Ready to deploy?** Make sure every checkbox above is ✓ checked!
