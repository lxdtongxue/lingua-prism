// iOS Safari can extend the document background into its top and bottom chrome.
// A single opaque theme-color overrides that treatment with one flat tint.
// Leave the two document edge colors to Safari; other browsers keep theme-color.
const ua = navigator.userAgent
const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const safari = /AppleWebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
if (ios && safari) document.querySelector('meta[name="theme-color"]')?.setAttribute('media', 'not all')
