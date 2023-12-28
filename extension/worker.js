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
	case "getDomainString":
		// Return the storage prefix with the domain of the tab.
		sendResponse(storagePrefix + sender.tab.url.split("/")[2]);
		break;
	case "getActiveSinkId":
	case "getActiveDevice":
		// Create a proxy response function to catch errors that can happen
		// when one of the non-top content scripts loads before top is done.
		var responder = function (...args){
			if (args.length === 0)
			{
				console.log(chrome.runtime.lastError);
			} else {
				sendResponse.apply(this, args);
			}
		}
		// Relay the message to the top-level content script.
		chrome.tabs.sendMessage(sender.tab.id, request, responder);
		break;
	case "getMicAccess":
		// Return the current microphone access permissions for tab.
		// Unused currently as I couldn't find a useful way to restore
		// the value without breaking functionality.
		chrome.contentSettings.microphone.get({
			incognito: sender.tab.incognito,
			primaryUrl: sender.tab.url
		}).then(function (result) {
			sendResponse(result.setting);
		});
		break;
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
		}).then(function () {
			sendResponse(request.value);
		});
		break;
	case "injectSink":
		// Inject the current sinkId for the requesting tab into MAIN.
		// Then dispatch a "changeSinkId" event to update all elements.
		chrome.scripting.executeScript({
			args : [request.value],
			func : function (activeSinkId) {
				window.activeSinkId = activeSinkId;
				window.dispatchEvent(
					new CustomEvent(
						"changeSinkId",
						{ detail: activeSinkId }
					)
				);
			},
			target : {tabId : sender.tab.id, allFrames : true},
			world: "MAIN"
		});
		break;
	}
}

// Start listening immediately.
chrome.runtime.onMessage.addListener(onMessage);
