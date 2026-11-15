# Image Assist for Google Images

## Chrome Web Store

**Title:** Image Assist for Google Images

**Short description:** Find the original image, check its dimensions, format and file size, and download it directly from Google Images.

**Detailed description:**

Know which image you are saving.

Google Images may show a low-resolution preview before the original file is available. Image Assist adds a compact information card to the image preview so you can check the original before you download.

SEE THE ORIGINAL FILE
View the original image's dimensions, file format and file size when available. Image Assist checks the file itself instead of treating a thumbnail's details as the original.

DOWNLOAD WITH CONFIDENCE
Use Download original to open your browser's save dialog. The extension does not knowingly substitute a Google thumbnail when it cannot identify the original URL. You can also use the image context menu.

SPOT RECENT DOWNLOADS
New images have a green Download Original Image button. A matching successful download from the last 30 days changes it to a blue Download Again button. Matching stays local and uses the browser's download history, including native Save Image As downloads, without creating a separate database.

MAKE IT YOURS
Choose a default search size: any size, large, medium or icon. Existing size filters are preserved. Place the information card on either side of the page, with automatic light and dark themes.

CLEAR FEEDBACK
A loading indicator, explicit error states and a retry action show what is happening. Missing information is displayed as unavailable instead of being guessed.

PRIVATE BY DESIGN
No account, analytics or developer-operated data collection server. Settings stay in your browser. To inspect an image, the extension requests its file from the original hosting website.

PLEASE NOTE
Works on Google Images searches at google.com/search. Some image hosts restrict access, so format or file size may be unavailable even when the browser can display the original image. Automatic inspection is limited to 40 MB and an 18-second network timeout. Google page changes may affect preview detection. Image Assist helps identify the original file; it does not upscale images, remove watermarks or grant permission to reuse them.

Designed & developed by Reza Nemati — https://reza-nemati.ir

Image Assist is an independent extension and is not affiliated with or endorsed by Google.

## Firefox Add-ons

**Name:** Image Assist for Google Images

**Summary:** Check original image dimensions, format and file size in Google Images, then download the original with a clear, compact preview card.

**Description:** Use the detailed description above. Minimum Firefox version: 142.

## Developer dashboard copy

**Single purpose:** Help users identify, inspect and download the original image from a Google Images preview.

**downloads permission:** Opens a browser save dialog, checks local history for matching completed image downloads from the last 30 days, and receives completion events to update the button.

**contextMenus permission:** Adds a Download original image action to the image context menu on supported Google search pages.

**storage permission:** Saves the user's preferred search-size filter and information-card position locally.

**HTTP/HTTPS host access:** Original images can be hosted on arbitrary websites. The extension background requests the selected original image to determine its actual format, dimensions and file size. Content scripts run only on google.com/search pages. There is no developer-operated collection endpoint.

**Remote code:** None. Executable JavaScript and interface assets are bundled with the extension.

## Images and submission notes

- `01-original-image.png`: the actual extension card rendered over an illustrative image-search preview, with original landscape artwork.
- `02-preferences.png`: the actual settings page, including the Reza Nemati credit link.
- Both screenshots are 1280 × 800 PNG. The first uses a demonstration search environment, not a live Google search. The second embeds the actual settings document with sample local preferences.
- `promo-small.png`: 440 × 280 promotional tile for the Chrome listing.
- `../icon128.png` and `../icon512.png`: extension icon and larger artwork.
- See `PRIVACY.md` for a privacy-policy draft. Host it at a public URL before supplying a privacy-policy link to a store.
- Chrome and Firefox packages are separate in `dist/`. They have not been submitted, reviewed or signed.
- The Firefox extension ID is retained for update compatibility; the visible name is rebranded.

Screenshot requirements: [Chrome image guidance](https://developer.chrome.com/docs/webstore/images), [Mozilla listing guidance](https://www.extensionworkshop.com/documentation/develop/create-an-appealing-listing/).
