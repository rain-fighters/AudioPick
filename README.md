# AudioPick <img src="./resources/Icons/APV3_Icon_2d_2c_192.png" align="right" width="128" height="128">
A **Chrome Manifest V3 Extension** to pick a preferred audio output device for **HTML5** `<audio/>` and `<video/>` elements

## How it works
The extension finds **HTML5** `<audio/>` and `<video/>` elements within the document tree and manipulates the `sinkId` in order
to switch to the preferred audio output device. Since version `0.3.8` it also finds `Audio`, `Video` and `AudioContext` objects that have not been inserted into the document tree, e. g. **Spotify** and **SoundCloud** should now work with the extension, too.

Since it's now possible to store/remember a preferred audio output device **per site/domain**, the extension's **option panel** and hence the option to set a global preferred device (for the browser) has been removed. This also significantly reduces the number of microphone permission that the extension acquires (see below).

**Note** that the **Media Capture and Streams API** requires media (microphone) permissions to be granted to every site with audio sinks that need to be manipulated, which &ndash; as a result &ndash; allows those sites to access your microphone. Hence **AudioPick** only acquires permissions when the user actually picks a non-default device for a site and restores permissions when the user reverts back to using the default. Since version `0.3.10` a `smartMicAccess` mode can be activated in the UI which further reduces the number of microphone permissions granted by the extension.

Check the [**FAQ**](./FAQ.md) and the [**ChangeLog**](./CHANGELOG.md) for more information.

## Free/Libre Open Source
We publish this/our software as **Free/Libre Open Source** licensed under [**GPL-3.0**](https://www.gnu.org/licenses/gpl-3.0.en.html#license-text) to ensure that you have and continue to have the following four fundamental freedoms:
> - the freedom to use the software for any purpose,
> - the freedom to change the software to suit your needs,
> - the freedom to share the software with your friends and neighbors, and
> - the freedom to share the changes you make.

&ndash; [The Foundations of the GPL](https://www.gnu.org/licenses/quick-guide-gplv3.html#the-foundations-of-the-gpl)

While **Free/Libre Open Source** refers to **free** as in **free speech**, not as in **free beer**, we have chosen
- to not charge users for (a copy of) our software,
- to not re-license our software under a non-GPL (commercial) license,
- to not grant benefits or add additional features to/for users offering payment, and
- to not put (commercial) advertisements into our software or on our web pages.

Though we accept [&#10084;Gratuities](#gratuities).

## Privacy
**Privacy** and **Liberty** go hand in hand. You should not be **forced** to willingly or even unwillingly disclose personal data in order to be able to use a software or access information that is important for you. Hence neither our software nor our web pages collect usage data or require registration.

Our web pages are **static HTML documents** and do not set **cookies**. They do not contain any **JavaScript** code, unless it is required to provide a very specific function, e. g. local search, or to demonstrate some code in action.

Our software, in this case the **AudioPick** extension, does not track usage data by itself, though you need to be aware that installing an extension from the **Chrome WebStore** and using it in the **Chrome Browser** generates usage data which is shown on the **Chrome  WebStore** and **Developer Dashboard**, e. g. how often the extension is installed. We have opted out of using **google-analytics** to track and evaluate usage data ourselves. Also note that downloading the extension from **GitHub** probably leaves a trace, too.

If we get access to usage/user data, e. g. IP or email addresses, it's most likely unavoidable and we do our best to get rid of unneeded information, e. g. rotate log files of web servers we control. In any case, we do not transfer or even sell any usage/user data to 3rd parties.

## Gratuities
That all being said, you may show appreciation for our work by paying a completely voluntary tip. For that purpose we have created a [&#10084;Payment link on Stripe](https://buy.stripe.com/9AQ2bp1MJbkeboQ7ss) which allows you to give any amount between 1€ and 10€, defaulting to 3€ to keep the processing fee ratio in check.

Sadly, using this link/page for tipping does not work anonymously, e. g. **Stripe** requires you to enter a valid email address, but we haven't found a better / more private way, e. g. online cash, to show monetary appreciation over the internet. Hence you should only use the link/page, when you are aware of and agree to its privacy implications.

## Links
- [AudioPick Extension on the Chrome Webstore](https://chrome.google.com/webstore/detail/audiopick/gfhcppdamigjkficnjnhmnljljhagaha)
- [AudioPick Source on GitHub](https://github.com/rain-fighters/AudioPick)
- [AudioPick Issues on GitHub](https://github.com/rain-fighters/AudioPick/issues)
- [AudioPick Home](https://rain-fighters.github.io/AudioPick)
- [Rain-Fighters Home](https://rain-fighters.github.io/)

## Contributions
The **Manifest V3** `(0.3.X)` versions originate from a complete rewrite (of our **Manifest V2** version) which has been kindly contributed by [@XanSama](https://github.com/XanSama). **&#127876; Thank you! &#127876;**
