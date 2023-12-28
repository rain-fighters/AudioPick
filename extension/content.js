// Content script handles:
// 1) Loading and applying saved devices.
// 2) Listening for device change messages from popup/worker.
// Content script runs in WORLD:ISOLATED.
//
// Assume active device is system default until proven otherwise.
var activeDevice = "default";
var activeSinkId;

// Message handler.
// Messages are expected in the format {action: value, ...}
function onMessage(request, sender, sendResponse) {
	switch(request.action) {
		case "setActiveDevice":
			// The extension pop-up is asking us to set a new active device.
			setAudioDevice(request.device);
			break;
		case "getActiveDevice":
			// The exension pop-up or a child of this tab is asking for the
			// current active device. Only respond if we're the window.
			sendResponse(activeDevice);
			break;
		case "getActiveSinkId":
			// A child of this tab is asking for the current active sinkId.
			// Only respond if we're the window.
			sendResponse(activeSinkId);
			break;
	}
}

// Send the new/selected sinkId to the script in MAIN.
async function injectSinkId() {
	// If we're setting the device to something non-default get Mic access.
	if (activeSinkId !== "default") {
		await chrome.runtime.sendMessage({
			action: "setMicAccess",
			value: "allow"
		});
	}
	// If we have an activeSinkId.
	if (activeSinkId) {
		// Send the message to our worker to inject the sinkId and apply.
		await chrome.runtime.sendMessage({
			action: "injectSink",
			value: activeSinkId
		});
	}
	return true;
}

// Set the specified device as the audio sink for all elements.
async function setAudioDevice(deviceName) {
	var mediaDeviceInfo;
	var sinkId = "default";
	// If the target device is the system default skip straight to applying.
	if (deviceName !== "default") {
		// If we're setting it to anything other than the system default
		// make sure we have microphone access before we proceed.
		await chrome.runtime.sendMessage({
			action: "setMicAccess",
			value: "allow"
		});
		// Get the current list of audio devices.
		mediaDeviceInfo = await navigator.mediaDevices.enumerateDevices();
		mediaDeviceInfo.every(function (device) {
			// Skip any audio input devices or devices without deviceIds.
			if ((device.kind === "audiooutput" && device.deviceId) && (
				// If the device label or device id matches our device name
				// then set our sinkId to the deviceId.
				(
					device.label === deviceName
				) || (
					device.deviceId === deviceName
				)
			)) {
				sinkId = device.deviceId;
				return false;
			}
			return true;
		});
	}
	// Set our selected sinkId as the active.
	activeSinkId = sinkId;
	// Set the active device name to the sinkId for default devices.
	// Set it to the device label/name otherwise.
	if (sinkId === "default" || sinkId === "communications") {
		activeDevice = sinkId;
	} else {
		activeDevice = deviceName;
	}
	// Update all elements on the page with the new sinkId.
	await injectSinkId();
	return true;
}

async function init(){
	// If we're top read settings from storage and set the active device.
	if (window === top) {
		// Start listening for messages.
		chrome.runtime.onMessage.addListener(onMessage);
		// Get our domain string prefix from the worker.
		const domainString = await chrome.runtime.sendMessage({
			action: "getDomainString"
		});
		// Get any stored values.
		const storage = await chrome.storage.local.get(
			[domainString]
		);
		// Apply stored values if present.
		if (storage[domainString]) {
			activeDevice = storage[domainString];
		}
		await setAudioDevice(activeDevice);
	} else {
		// If not top request the current active device info from top via worker.
		// Set sinkId on all children.
		activeSinkId = await chrome.runtime.sendMessage({
			action: "getActiveSinkId"
		});
		activeDevice = await chrome.runtime.sendMessage({
			action: "getActiveDevice"
		});
		await injectSinkId();
	}
	return false;
}

init();
