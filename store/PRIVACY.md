# Privacy policy — Image Assist for Google Images

Last updated: November 15, 2026

Image Assist for Google Images is developed by Reza Nemati.

## Operation

The extension reads image elements and related URLs on supported Google Images search pages to identify the selected original image. It requests that image from its original hosting website to inspect file format, dimensions and size. Clicking Download Original Image asks the browser to download the selected file.

## Data and storage

The extension does not send browsing activity, search terms, image URLs or image files to a server operated by the developer. It has no analytics, advertising, accounts or tracking service.

Search-size preferences and card-position settings are stored locally in the browser. Recently inspected metadata and in-progress image bytes are held temporarily in memory; there is no image-history database. Downloaded files and download history are managed by the browser under the user's control.

To show Download Again, the extension checks the browser's local download history for the selected image URL or final redirected URL, limited to completed downloads started in the last 30 days. This can include native Save Image As downloads. The lookup and matching stay in the browser; the extension does not send these records to a server or store a separate history database. Clearing the browser's download history removes the corresponding indicators.

## Third-party requests

Image inspection and downloads contact the website hosting the selected image. These sites receive normal network information, including the user's IP address and request headers, and their own privacy policies apply. Metadata inspection uses requests without credentials. Browser-managed downloads may behave differently according to browser and website settings.

Clicking developer or icon-attribution links opens their external websites. Those sites are not contacted merely by opening the extension's settings.

## Permissions and choices

HTTP/HTTPS host access enables file inspection across image-hosting websites. Downloads access enables saving files, checking recent completed downloads and receiving completion events. Context-menu access provides the original-image menu action. Storage access saves local preferences. The content script runs only on google.com/search pages.

Preferences can be changed in settings. Uninstalling the extension removes its local settings; downloaded files remain on disk until removed by the user.

## Contact

Developer website: https://reza-nemati.ir
