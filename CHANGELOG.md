# CHANGELOG

### AudioPick-0.1.4 - 2016-05-17
- add `'use strict'` to all scripts
- inject the content script into all frames so that `setSinkId()` now also works for embedded audio/video (over HTTPS)
- only call `getUserMedia()` on a site (once) when a call to `setSinkId` actually fails. This should greatly reduce the number of sites added to the list of microphone exceptions.  
- change `browser_action` into `page_action`
- immediately commit changes to the popup device list (commit button removed)
- remember the last temporary `sink_no` choice of a content page when creating the popup device list for it
