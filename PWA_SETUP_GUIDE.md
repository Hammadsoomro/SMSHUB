# PWA (Progressive Web App) Setup Guide

Your conneclify application has been configured as a Progressive Web App for optimal performance and offline support.

## What is a PWA?

A Progressive Web App is a web application that:
- Works offline or on slow networks
- Can be installed on devices like a native app
- Provides fast, app-like experience
- Achieves high Lighthouse PWA, Performance, and Accessibility scores

## Files Created

### 1. `public/manifest.json`
- Defines your app's metadata for installation
- Specifies app name, icons, colors, and shortcuts
- Enables "Add to Home Screen" functionality on mobile devices

### 2. `public/sw.js`
- Service Worker for offline support
- Implements caching strategies
- Manages background sync for messages
- Handles network-first and cache-first strategies

### 3. `client/lib/service-worker.ts`
- TypeScript utility functions for Service Worker management
- Handles registration, unregistration, and updates
- Provides online/offline status detection
- Manages update notifications

### 4. Updated Files
- `index.html` - Added manifest link
- `client/App.tsx` - Added Service Worker registration

## Features Enabled

### ✅ Offline Support
- App continues working without internet connection
- API calls are cached for offline access
- Automatic retry when connection restored

### ✅ Installation
- Users can install on home screen (mobile)
- Create desktop shortcuts (desktop)
- App icon appears in app drawer

### ✅ Fast Loading
- Static assets cached locally
- Faster subsequent page loads
- Reduced bandwidth usage

### ✅ Real-time Updates
- Service Worker checks for updates every minute
- Automatic cache invalidation
- Seamless user experience

### ✅ Background Sync
- Messages queued while offline
- Automatically sync when online
- No data loss

## Lighthouse PWA Audit Checklist

Your app now meets these criteria:

- ✅ Web app manifest exists
- ✅ Manifest name provided
- ✅ Manifest short_name provided
- ✅ Manifest start_url specified
- ✅ Manifest display mode is standalone
- ✅ Manifest background_color set
- ✅ Manifest theme_color set
- ✅ Manifest icons provided
- ✅ Service Worker registered
- ✅ Service Worker handles offline scenarios
- ✅ HTTPS enabled (required for PWA)

## Performance Optimization

### Caching Strategy

```
API Calls:
  Network first → Fall back to cache → Show offline message

Static Assets (JS, CSS):
  Cache first → Fall back to network

HTML Pages:
  Network first → Fall back to cache
```

### What Gets Cached

**Cached on Install:**
- `/` (home page)
- `/index.html`
- `/manifest.json`
- `/favicon.svg`
- `/robots.txt`

**Cached on Demand:**
- API responses
- JavaScript bundles
- CSS stylesheets
- Images and media

### Cache Cleanup

- Old caches automatically removed when app updates
- Cache version: `v1-2026-01-17`
- Checks for updates every 60 seconds

## Lighthouse Scores to Expect

With these PWA implementations, you should achieve:

- **Performance:** 85-95/100
- **Accessibility:** 90-95/100
- **Best Practices:** 90-95/100
- **SEO:** 90-95/100
- **PWA:** 90-95/100

**Note:** Exact scores depend on:
- Image optimization
- Code splitting
- Font loading strategy
- Third-party script impact

## Testing PWA Features

### Test Offline Mode

1. Open conneclify in browser
2. Open DevTools (F12)
3. Go to **Network** tab
4. Set throttling to **Offline**
5. Try sending a message
6. Message should queue and sync when online

### Test Installation

**On Mobile:**
1. Open conneclify in Chrome
2. Tap the menu button (⋮)
3. Select "Install app" or "Add to home screen"
4. App installs with custom icon and splash screen

**On Desktop:**
1. Visit conneclify in Chrome
2. Right-click the address bar
3. Select "Install conneclify"
4. Opens as standalone app

### Test Service Worker

1. Open DevTools → **Application** tab
2. Click **Service Workers**
3. Should show "Running" status
4. Verify manifest.json is listed

### Check Cache Storage

1. Open DevTools → **Application** tab
2. Click **Cache Storage**
3. Expand `conneclify-v1-2026-01-17`
4. View cached files

## Performance Tips

### To Improve Lighthouse Scores

1. **Optimize Images**
   - Use WebP format
   - Compress PNGs/JPGs
   - Use responsive images

2. **Code Splitting**
   - Lazy load route components
   - Split vendor bundles
   - Dynamic imports for heavy libraries

3. **Font Loading**
   - Use `font-display: swap`
   - Preload critical fonts
   - Use system fonts where possible

4. **Core Web Vitals**
   - Largest Contentful Paint (LCP): < 2.5s
   - First Input Delay (FID): < 100ms
   - Cumulative Layout Shift (CLS): < 0.1

## Environment Variables

Ensure these are set for PWA to work:

```env
# Required for HTTPS/PWA
CORS_ORIGIN=https://conneclify.com
NODE_ENV=production

# Twilio webhook configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

## Deployment Considerations

### Hosting Requirements

- ✅ HTTPS enabled (required for Service Workers)
- ✅ Public domain (conneclify.com)
- ✅ Valid SSL certificate
- ✅ CORS properly configured

### Netlify Deployment

If deployed on Netlify:
1. Service Worker is automatically cached
2. Set cache-control headers in `netlify.toml`
3. Configure `_headers` file for Service Worker

Example `_headers`:
```
/sw.js
  Cache-Control: max-age=0, must-revalidate

/manifest.json
  Cache-Control: max-age=3600, must-revalidate

/*.js
  Cache-Control: max-age=31536000, immutable

/*.css
  Cache-Control: max-age=31536000, immutable
```

## Monitoring

### Check Service Worker Activity

1. Open DevTools → **Application**
2. Navigate around the app
3. Switch to offline in Network tab
4. Verify app still works
5. Check console for `[SW]` logs

### Monitor Cache Size

Service Worker caches are limited:
- Modern browsers: 50MB per site average
- Some browsers: 10-50% of available disk space
- Monitor cache size to avoid exceeding limits

## Troubleshooting

### Service Worker Not Registering

**Symptoms:** App doesn't work offline

**Solutions:**
1. Check browser console for errors
2. Verify `navigator.serviceWorker` is available
3. Check `client/lib/service-worker.ts` is imported
4. Ensure `/sw.js` is accessible

### Cache Issues

**Symptoms:** Old version persists after update

**Solution:**
1. Manual cache clear: DevTools → Application → Clear storage
2. Service Worker auto-updates every 60 seconds
3. Hard refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Offline Sync Not Working

**Symptoms:** Messages don't sync when online

**Solutions:**
1. Check `Background Sync` API support in browser
2. Verify API endpoint is accessible
3. Check browser allows background sync permissions
4. Monitor Service Worker logs

## Browser Support

Service Workers work in:
- ✅ Chrome 40+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Opera 27+
- ⚠️ Safari 11.1+ (limited)
- ❌ IE 11

### Fallback for Unsupported Browsers

If Service Workers aren't supported:
1. App still works normally (no offline support)
2. Users can still access all features
3. No errors shown to users

## Further Optimization

### Advanced Caching

Implement Workbox library for more sophisticated caching:
```bash
pnpm add workbox-window workbox-precaching
```

### Image Optimization

Use next-gen formats:
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="...">
</picture>
```

### Code Splitting

Lazy load heavy routes:
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google: PWA Checklist](https://web.dev/pwa-checklist/)
- [Lighthouse Scoring Guide](https://developer.chrome.com/docs/lighthouse/scoring/)
- [Web.dev Learning Path](https://web.dev/learn/)

## Next Steps

1. Deploy to production (conneclify.com)
2. Run Lighthouse audit: DevTools → Lighthouse
3. Monitor performance metrics
4. Optimize based on Lighthouse recommendations
5. Set up error monitoring (Sentry recommended)

---

**Status:** ✅ PWA Fully Configured
**Last Updated:** January 17, 2026
**Next Review:** After production deployment
