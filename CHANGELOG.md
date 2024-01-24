# CHANGELOG

### AudioPick-0.3.10
- Improve debug logging, e. g. inject "enableDebug" into content scripts running world MAIN.
- Fully support Deezer and SoundCloud.
- Add a "smartMicAccess" mode (enabled via checkbox in the Popup) which significantly reduces microphone permissions granted by the extension.
- Add an info message to the popup header.
- Add a "site info heading" with favicon, host/domain and micPolicy.
- No longer offer the "communications" device to be picked.
- Improve "default" device label on Windows (and possibly MacOS).
- Improve demo page (resources/index.*), e. g. add an AudioContext and a video in iframe example.
- Fix/enhance communication with sub-frames, but disable injecting
into all_frames for now, since changing sinkIds in sub-frames only works on same-origin or when the iframe specifies allow="microphone".

### AudioPick-0.3.9
- Add a Popup / UI option to enable/disable content script debug messages.
- Detect and respect site Permissions-Policy for microphone access,
  e. g. on https://stackoverflow.com
- Work around a Chrome on linux bug/issue where the service worker does
  not wake up (fast enough) from inactive state on message events.

### AudioPick-0.3.8
- Rewrite for Manifest V3
- New enhanced Popup / UI with dark/light mode support
- New icon / logo
- Allow to store (star) a preferred audio device per domain
- Remove option to set a global preferred device for the browser
- Inject a content script into `world:MAIN` in order to find
  media elements which havent't been inserted into the DOM tree,
  i. e. sites like **Spotify** and **SoundCloud** should now work, too.
- Minimize the number of **microphone permissions** added/managed by the extension
  - by resetting the permission back to **ask** when the default device has been
    chosen again for a tab/domain
  - by not having a global preferred device for the browser anymore

### AudioPick-0.2.2 - 2016-05-21
- going stable
- revert `page_action back` to `browser_action`
- code cleanup

### AudioPick-0.2.1 - 2016-05-18
- quick fix to prevent a loop caused by the *observer*

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
