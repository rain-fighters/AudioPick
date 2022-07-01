# AudioPick
A *Chrome Extension* to pick a default audio output device for HTML5 audio and video elements

## How it works
The extension finds HTML5 audio and video elements within the document tree and manipulates the `sinkId` in order
to switch to the desired audio output device. The extension does not and will never find flash objects.
It also does not find audio/video node objects (`new Audio(...)`) that have not been inserted into the document tree.

**Note** that the API requires a successful call to `getUserMedia()` for every site with audio sinks that
need to be manipulated which - as a result - creates entries under `contentSettings['microphone']`, i. e.
it allows those sites to access your microphone.

## Free/Libre Open Source
We publish our software as **Free/Libre Open Source** licensed under **GPL 3.0**. You will never have to pay for any **Rain-Fighters** software, but you can **[&#9749; Buy us a Coffee](https://www.buymeacoffee.com/rainfighters)**, if you like what we made.

## Privacy
**Privacy** and **Liberty** go hand in hand. We will never abuse the fact that you install our software or visit our websites to contact you or to even sell any information about you. Also, the software and the websites will always stay ad-free.

## Links
- [Rain-Fighters](https://rain-fighters.github.io/)
- [AudioPick Source on GitHub](https://github.com/rain-fighters/AudioPick)
- [AudioPick Extension on Chrome Webstore](https://chrome.google.com/webstore/detail/audiopick/gfhcppdamigjkficnjnhmnljljhagaha)
