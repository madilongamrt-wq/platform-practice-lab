# Install Platform Practice Lab

Live URL: https://platform-practice-lab-mwcv1o.v2.appdeploy.ai/

## Android

Open the live URL in Chrome.
Select Install lab to see instructions or an Install now button when Chrome offers installation.
Alternatively, open Chrome's three-dot menu and choose Add to Home screen or Install app, then confirm.
If the link opened inside ChatGPT or another app, open it in Chrome first.

## iPhone

Open the live URL in Safari.
Open Share, choose Add to Home Screen, enable Open as Web App if shown, and tap Add.
An app-store account is not needed for home-screen installation.

## Computer

Use Chrome or Edge and select the install icon in the address bar, or the browser's installation menu.

## Online and offline behavior

The installed app uses the same live service as the website.
Sign-in, exercises, and saving progress require an internet connection.
The service worker caches only the public offline page, manifest, and app icons.
Navigation uses the network first and shows a reconnect page when the network is unavailable.
It does not cache answers, authenticated requests, API responses, or sign-in responses.
This is an installable web app, not a Google Play or Apple App Store listing.

## Verification

Run with Node.js 24 or newer:

```bash
node --disable-warning=ExperimentalWarning tools/test-pwa.cjs
```

The checks cover manifest metadata, real PNG dimensions, install prompt consumption and dismissal, registration scope, offline navigation, and bypass of private requests.
GitHub Actions runs these checks with the backend regression suite.
Device installation requires a real browser and user confirmation. Automated checks do not claim that an app has been installed on a phone.

## Updating

Deploy updated files through the existing AppDeploy app workflow, and keep this repository in sync.
Public offline resources use a versioned cache. Change the cache version in public/sw.js when changing those resources.
The application document is not cached by this service worker, so online launches load current application code.

Official guidance:
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://support.apple.com/guide/iphone/iphea86e5236/ios
