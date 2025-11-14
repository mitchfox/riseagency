# PWA Deployment Guide for RISE Portal

## 📋 Pre-Deployment Checklist

Before deploying updates, ensure:
- [ ] All code changes are tested locally
- [ ] Service worker version is updated in `public/sw.js` (line 2)
- [ ] Icons are generated and placed in `public/lovable-uploads/`
- [ ] Manifest.json is properly configured

## 🚀 Deployment Steps

### 1. Update Service Worker Version

**CRITICAL**: Always update the cache version in `public/sw.js`:

```javascript
// Line 2 of public/sw.js
const CACHE_VERSION = 'rise-portal-v1.0.X'; // Increment X for each deployment
```

### 2. Deploy to Platform

#### Vercel
```bash
vercel --prod
```

#### Netlify
```bash
netlify deploy --prod
```

#### Firebase
```bash
firebase deploy
```

### 3. Verify PWA Functionality

After deployment:

1. **Clear browser cache** (important!)
2. Visit your deployed URL
3. Open Chrome DevTools → Application → Service Workers
4. Verify new service worker is registered
5. Check for update notification in app

## 🔄 How Updates Work

### Network-First Strategy
- App tries to fetch from network first
- If network fails, falls back to cache
- Cache is updated when network succeeds

### Automatic Updates
- Service worker checks for updates every 60 seconds
- When new version detected, shows "Update Available" notification
- Users click "Update Now" to refresh

### Manual Testing
```javascript
// In browser console:
navigator.serviceWorker.getRegistration().then(reg => reg.update())
```

## 📱 Testing on Devices

### iOS (Safari)
1. Visit app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Launch from home screen

### Android (Chrome)
1. Visit app in Chrome
2. Tap menu (⋮)
3. Select "Install app"
4. Launch from home screen

## 🐛 Troubleshooting

### Update Not Showing
1. Check service worker version was updated
2. Clear browser cache completely
3. Unregister old service worker in DevTools
4. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Install Prompt Not Appearing
- Must be served over HTTPS
- Must have valid manifest.json
- Must have service worker registered
- User must meet browser criteria (varies by browser)

### Users Stuck on Old Version
- Increment cache version in sw.js
- Deploy new version
- Update notification will appear automatically
- Users click "Update Now" to force refresh

## 📝 Version History

Keep track of deployments:

| Version | Date | Changes |
|---------|------|---------|
| v1.0.1  | 2025-01-14 | Initial PWA setup with network-first caching |
| v1.0.X  | YYYY-MM-DD | [Your changes here] |

## 🔒 Cache Control Headers

The following files have cache-control headers set:
- `sw.js` - Must revalidate every time
- `manifest.json` - Must revalidate every time  
- `index.html` - Must revalidate every time

This ensures users always get the latest version of these critical files.

## 📞 Support

If users report issues:
1. Ask them to check Chrome DevTools Console for errors
2. Verify they're on latest version (shown in "Latest App Update" section)
3. Guide them to uninstall and reinstall if needed
4. Check service worker registration status

---

**Remember**: Always increment the cache version number for each deployment!
