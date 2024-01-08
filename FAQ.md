# FAQ
Work in progress ...

- TOC
{:toc}

### Why does the extension need **Microphone Access**?
...

### Are there **Conflicts** between the extension and sites which manage audio devices on their own, e. g. **Discord**, **Teams**, **Signal**, **Elements**, ...?
...

### Which **Platforms** are supported by the extension?
...

### Which **Sites** are supported by the extension? 
Generally only **HTTPS** sites are supported. This excludes internal chrome browser pages like `chrome://settings` as well as sites not offering **SSL** encryption. The latter is rather rare nowadays and usually means that the site is either misconfigured or should not be trusted anyway.

Another case are sites which (somehow) disable extensions entirely, e. g. the **Chrome WebStore** (`https://chromewebstore.google.com`), or sites which explicitly deny microphone access by sending a `Feature-Policy` or `Permissions-Policy` **Response Header** stating so.

All of these cases are indicated by an <code class="error_message">Error Message</code> in the footer of the extension popup.

Other sites should work as long as they are using **HTML5** elements of type `HTMLMediaElement` or `AudioContext` to play audio and we have been smart enough to find them and inject our `changeSinkId` listener. The following table is the result of testing various popoular sites with **AudioPick-0.3.9** on **Chrome 120 (64-bit) / Windows 10** &ndash; current as of **January 2024**.

| Site | Status | Comment |
|------|--------|---------|
| **YouTube**<br>`https://www.youtube.com` | Fully Working | No known issues. |
| **Twitch**<br>`https://www.twitch.tv` | Fully Working | No known issues. |
| **YoutTube Music**<br>`https://music.youtube.com` | Fully Working | No known issues. |
| **Spotify**<br>`https://open.spotify.com` | Fully Working | No known issues. |
| **SoundCloud**<br>`https://soundcloud.com`| Mostly Working | Might require a page reload when a new tab is opened through a link/bookmark to a specific track and autoplay starts before **AudioPick** is able to inject its `changeSinkId` listener properly. |
| **Deezer**<br>`https://www.deezer.com` | Kinda Working | Requires to click `Play->Pause->Play` once after (re-)loading the page in order to help **AudioPick** to inject its `changeSinkId` listener properly. See [Issue #49 on GitHub](https://github.com/rain-fighters/AudioPick/issues/49). | 
| **Amazon Music**<br>`https://music.amazon.com` | Probably Working | The demo podcasts worked (without needing a subscription). |
| **Netflix**<br>`https://www.netflix.com` | Fully Working | No known issues. |
| **Disney+**<br>`https://www.disneyplus.com` | Maybe Working | Don't have a subscription and hence cannot test. Reports from other **AudioPick** users via [GitHub Issue](https://github.com/rain-fighters/AudioPick/issues) welcome. |

### Why isn't the extension available for **Other Browsers**, e. g. **Firefox**?
...

### Where do I report **Issues** with the extension?
...

### How did you come up with the **Idea** for the extension?
...

### How can I **Support AudioPick**?
...

### What is or rather who are **Rain-Fighters**?
...
