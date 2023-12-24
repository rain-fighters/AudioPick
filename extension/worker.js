// Our worker exists for two reasons only:
// 1. To provide microphone access to our content script for basic function.
// 2. To relay messages from any frames/iframes/children back to the main tab.
function onMessage(request, sender, sendResponse) {
	switch (request.action) {
	case "getDomainString":
		// Return the storage prefix with the domain of the tab.
		sendResponse("defaultDevice_" + sender.tab.url.split("/")[2]);
		break;
	case "getActiveSinkId":
	case "getActiveDevice":
		// Relay the message to the top-level content script.
		chrome.tabs.sendMessage(sender.tab.id, request, sendResponse);
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
		// Then call setAllSinks() in MAIN to apply.
		chrome.scripting.executeScript({
			args : [request.value],
			func : function (activeSinkId) {
				top.activeSinkId = activeSinkId;
				setAllSinks();
			},
			target : {tabId : sender.tab.id},
			world: "MAIN"
		});
		break;
	}
	return true;
}

// Start listening immediately.
chrome.runtime.onMessage.addListener(onMessage);
