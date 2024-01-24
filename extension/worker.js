// Worker script handles:
// 1) Providing microphone access to our content script for basic function.
// 2) Relaying messages from any frames/iframes/children back to the main tab.
// 3) Injecting sinkId changes into WORLD:MAIN.
// Worker runs in BACKGROUND.
//
// Prefix used for our local storage variables.
const storagePrefix = "preferredDevice_";

function onMessage(request, sender, sendResponse) {
	switch (request.action) {
	case "getActiveDeviceBG":
		// Create a proxy response function to catch errors that can happen
		// when the top content scripts is not (yet) resposnding.
		const responder = function (...args) {
			if (args.length === 0) {
				if (chrome.runtime.lastError) {
					// Do nothing.
					// We just need to read this lastError value to
					// prevent an error being logged to the console.
				 }
				 // The top content script is not (yet) responding
				sendResponse(null);
			} else {
				sendResponse.apply(this, args);
			}
		}
		// Relay the message to the top (frameId: 0) content script.
		chrome.tabs.sendMessage(sender.tab.id,
			{action: "getActiveDevice"}, {frameId: 0}, responder);
		// We need to return true from onMessage() to keep the channel open,
		// since our sendReponse() is called asynchronously here.
		return true;
	case "setMicAccess":
		// Set the current microphone access permissions for the tab.
		// Request format: {value: "allow"}
		chrome.contentSettings.microphone.set({
			primaryPattern: sender.tab.url.split("/")[0] + "//" +
			sender.tab.url.split("/")[2] + "/*",
			scope: (
				sender.tab.incognito
				? "incognito_session_only"
				: "regular"
			),
			setting: request.value
		}).then(function() {
			sendResponse(true);
		}).catch(function() {
			sendResponse(false);
		});
		return true;
	case "injectSink":
		// Inject the passed sinkId (request.value) into MAIN.
		// Then dispatch a "changeSinkId" event to update all elements.
		//
		// NOTE that target: {allFrames: true} does not make sense, simce
		// 1. we only want to target frames where we actually injected our
		//    content scripts and
		// 2. (even more importantly) sinkIds are unique per frame, i. e.
		//    the same device has a different deviceId in top and in sub.
		// Basically the content scripts for top and sub-frames need to
		// independently calculate and pass the correct sinkId for their
		// window/frame and the worker needs to explicitely target the
		// sender's frameId(s).
		chrome.scripting.executeScript({
			args: [request.value],
			func: function (activeSinkId) {
				window.APV3_UN1QU3_activeSinkId = activeSinkId;
				window.dispatchEvent(
					new CustomEvent(
						"changeSinkId",
						{detail: activeSinkId}
					)
				);
			},
			target: {tabId: sender.tab.id, frameIds: [sender.frameId], allFrames : false},
			world: "MAIN"
		});
		break;
	case "injectDebug":
		chrome.scripting.executeScript({
			args: [request.value],
			func: function (enableDebug) {
				window.APV3_UN1QU3_enableDebug = enableDebug;
			},
			target: {tabId: sender.tab.id, frameIds: [sender.frameId], allFrames : false},
			world: "MAIN"
		});
		break;
	case "wakeup":
		// A dumnmy message that we are being sent to wake us up.
		// This is a hack/workaround for a chrome bug on linux.
		break;
	}
}

// Start listening immediately.
chrome.runtime.onMessage.addListener(onMessage);
