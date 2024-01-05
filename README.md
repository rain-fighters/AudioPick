# AudioPick
A **Chrome Manifest V3 Extension** to pick a preferred audio output device for **HTML5** `<audio/>` and `<video/>` elements

## How it works
The extension finds **HTML5** `<audio/>` and `<video/>` elements within the document tree and manipulates the `sinkId` in order
to switch to the preferred audio output device. Since version `0.3.8` it also finds audio/video objects (`new Audio(...)`) that have not been inserted into the document tree, e. g. **Spotify** and **SoundCloud** should now work with the extension, too.

Since it's now possible to store/remember a preferred audio output device per **domain**, the extension's **option panel** and hence the option to set a global preferred device (for the browser) has been removed. This also sigificantly reduces the number of microphone permission that the extension acquires (see below).

**Note** that the **Audio Ouput Devices API** requires media (microphone) permissions to be granted to every site with audio sinks that need to be manipulated, which &ndash; as a result &ndash; allows those sites to access your microphone. Hence **AudioPick** only acquires permission when the user actually picks a non-default device for a site and restores permissions when the user reverts back to using the default.

## Free/Libre Open Source
We publish our software as **Free/Libre Open Source** licensed under [**GPL-3.0**](https://www.gnu.org/licenses/gpl-3.0.en.html#license-text) to ensure that you have and continue to have the following four fundamental freedoms:
> - the freedom to use the software for any purpose,
> - the freedom to change the software to suit your needs,
> - the freedom to share the software with your friends and neighbors, and
> - the freedom to share the changes you make.

&ndash; [The Foundations of the GPL](https://www.gnu.org/licenses/quick-guide-gplv3.html#the-foundations-of-the-gpl)

While **Free/Libre Open Software** means **free** as in **free speech** not as in **free beer** we have decided
- to not charge users for (a copy of) our software,
- to not re-license our software under a non-GPL (commercial) license,
- to not grant benefits or add additional features to/for users offering payment, and
- to not put (commercial) advertisements into our software or on our website.

Though we accept &#10084;[Gratuities](#Gratuties).


## Privacy
**Privacy** and **Liberty** go hand in hand. We will never abuse the fact that you use our software or visit our websites to contact you or to even sell any information about you.

## Gratuities
Coming soon ...

## Links
- [AudioPick Extension on the Chrome Webstore](https://chrome.google.com/webstore/detail/audiopick/gfhcppdamigjkficnjnhmnljljhagaha)
- [AudioPick Source on GitHub](https://github.com/rain-fighters/AudioPick)
- [AudioPick Issues on GitHub](https://github.com/rain-fighters/AudioPick/issues)
- [AudioPick Home](https://rain-fighters.github.io/AudioPick)
- [Rain-Fighters Home](https://rain-fighters.github.io/)

## Contributions
The **Manifest V3** version is a complete rewrite of the original **Manifest V2** version and has been kindly contributed by [@XanSama](https://github.com/XanSama). **&#127876; Thank you! &#127876;**
