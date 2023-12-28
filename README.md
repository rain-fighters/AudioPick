# AudioPick <img src="./extension/APV3_Icon_2d_2c_192.png" align="right" width="128" height="128">
A **Chrome Manifest V3 Extension** to pick a preferred audio output device for **HTML5** `<audio/>` and `<video/>` elements

## How it works
The extension finds **HTML5** `<audio/>` and `<video/>` elements within the document tree and manipulates the `sinkId` in order
to switch to the preferred audio output device. Since version `0.3.X` it also finds audio/video objects (`new Audio(...)`) that have not been inserted into the document tree, e. g. **Spotify** and **SoundCloud** should now work with the extension, too.

Since it's now possible to store/remember a preferred audio output device per **domain**, the extension's **option panel** and hence the option to set a global preferred device (for the browser) has been removed.

**Note** that the **Audio Ouput Devices API** requires a successful call to `getUserMedia()` for every site with audio sinks that need to be manipulated, which &ndash; as a result &ndash; creates entries under `contentSettings['microphone']`, i. e.
it allows those sites to access your microphone.

## Links
- [AudioPick Extension on the Chrome Webstore](https://chrome.google.com/webstore/detail/audiopick/gfhcppdamigjkficnjnhmnljljhagaha)
- [AudioPick Source on GitHub](https://github.com/rain-fighters/AudioPick)
- [AudioPick Issues on GitHub](https://github.com/rain-fighters/AudioPick/issues)
- [AudioPick Home](https://rain-fighters.github.io/AudioPick)
- [Rain-Fighters Home](https://rain-fighters.github.io/)

## Contributions
The **Manifest V3** version is a complete rewrite of the original **Manifest V2** version and has been kindly contributed by [@XanSama](https://github.com/XanSama). **&#127876; Thank you! &#127876;**
