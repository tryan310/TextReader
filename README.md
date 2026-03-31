# Text Reader Chrome Extension

Text Reader is a Chrome extension that reads highlighted webpage text aloud using the browser's built-in speech synthesis.

## Files
- `manifest.json` — Chrome extension manifest
- `content.js` — inline text selection toolbar and speech playback
- `background.js` — lightweight service worker setup
- `popup.html` / `popup.css` / `popup.js` — extension toolbar popup UI
- `icons/` — required Chrome Web Store icons
- `PRIVACY.md` — privacy policy draft
- `STORE_LISTING.md` — Chrome Web Store listing copy
- `store-assets/icon-1024.png` — source icon asset

## Load locally in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `/Users/thomasryan/Desktop/chrome app/outputs`
5. Pin the extension if desired

## Package for Chrome Web Store
1. Make sure the extension works as expected when loaded unpacked
2. Zip the contents of this folder
3. Upload the zip in the Chrome Web Store developer dashboard
4. Fill in the listing using `STORE_LISTING.md`
5. Upload screenshots and provide a privacy policy URL if required

## Notes
- This version removes the speed slider
- Playback continues if the user clicks away from the page selection
- Popup controls in the Chrome toolbar allow Read, Pause/Play, and Stop
