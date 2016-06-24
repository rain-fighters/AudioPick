# CHANGELOG

### AudioPick-0.2.2 - 2016-05-21
- going stable
- revert `page_action back` to `browser_action`
- code cleanup

### AudioPick-0.2.1 - 2016-05-18
- quick fix for to prevent a loop caused by the *observer*

### AudioPick-0.2.0 - 2016-05-18
- substitute calls to `getUserMedia()` by `get_help_with_GUM`, i. e. write directly to `contentSettings['microphone']` thereby allowing the modification of audio/video on unencrypted pages 
- code cleanup + better diagnostic output
- fixes to handling of asynchronous actions, especially promises
- overwrite devices for an entire frame set, i. e. when sub frames ask the background page for the `default_no`, it asks the top frame and passes this information back to the sub frame
- popup only ever asks the top frame for its current `sink_no` 
 
### AudioPick-0.1.4 - 2016-05-17
- add `'use strict'` to all scripts
- inject the content script into all frames so that `setSinkId()` now also works for embedded audio/video (over HTTPS)
- only call `getUserMedia()` on a site (once) when a call to `setSinkId` actually fails. This should greatly reduce the number of sites added to the list of microphone exceptions.  
- change `browser_action` into `page_action`
- immediately commit changes to the popup device list (commit button removed)
- remember the last temporary `sink_no` choice of a content page when creating the popup device list for it
