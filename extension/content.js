// Content script handles:
// 1) Loading and applying saved devices.
// 2) Listening for device change messages from popup/worker.
// Content script runs in WORLD:ISOLATED.
//
// Assume active device is system default until proven otherwise.
var activeDevice = "default";
var activeSinkId;

// Write to console.log, if debugging is enabled.
function debugMessage(...args) {
	chrome.storage.local.get(["enableDebug"]).then(function(result) {
		if (result && result.enableDebug) {
			console.log('APV3-content.js', ...args);
		}
	});
}

// Messages are expected in the format {action: value, ...}
// NOTE that only the content script for the top window/frame
// registers this message listener.
function onMessage(request, sender, sendResponse) {
	switch(request.action) {
		case "setActiveDevice":
			// The extension popup is asking us to set a new active device.
			setAudioDevice(request.device);
			break;
		case "getActiveDevice":
			// The exension popup or a child of this tab is asking for the
			// current active device.
			sendResponse(activeDevice);
			break;
		case "getActiveSinkId":
			// A child of this tab is asking for the current active sinkId.
			sendResponse(activeSinkId);
			break;
		case "getMicPolicy":
			// The extension popup is asking us, whether we will be able to set
			// non-default audio devices. Note that we cannot overide a "denied"
			// policy of a site (response header) by letting the service worker
			// change contentSettings["microphone"] to "allow", e. g.
			// https://stackoverflow.com sends in its header
			//     Feature-Policy: microphone 'none'; speaker 'none'
			// which results in a "denied" policy for "microphone" access
			// (and the invalid value "speaker 'none'" to be ignored).
			navigator.permissions.query({ name: "microphone" }).then(function(result) {
				sendResponse(result.state);
			});
			// We need to return true from onMessage() to keep the channel open,
			// since our sendReponse() is called asynchronously here.
			return true;
	}
}

async function wakeupWorker() {
	try {
		await chrome.runtime.sendMessage({
			action: "wakeup",
			value: "now"
		});
	} catch(e) {
		debugMessage("| wakeupWorker: Worker is hopefully awake now.");
	}
	return true;
}

// Send the new/selected sinkId to the script in MAIN.
async function injectSinkId() {
	var micPolicy = await navigator.permissions.query({ name: "microphone" });
	debugMessage("| injectSink:", window.location.href, "| activeSinkId:", activeSinkId, "| micPolicy.state:", micPolicy.state);
	if (micPolicy.state === "denied") {
		// Do not try get microphone access and/or change sinkIds. It's futile.
		return true;
	}
	// If we're setting the device to something non-default get Mic access.
	if (activeSinkId && (activeSinkId !== "default")) {
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
	var micPolicy = await navigator.permissions.query({ name: "microphone" });
	debugMessage("| setAudioDevice:", window.location.href, "| device:", deviceName, "| micPolicy.state:", micPolicy.state);
	if (micPolicy.state === "denied") {
		// Do not try get microphone access and/or change sinkIds. It's futile.
		return true;
	}
	// Send a dumnmy message to wake up the service worker
	// This is a hack/workaround for a chrome bug on linux
	await wakeupWorker();
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
			if ((device.kind === "audiooutput") && device.deviceId &&
				// If the device label or device id matches our device name
				// then set our sinkId to the deviceId.
				((device.label === deviceName) || (device.deviceId === deviceName))) {
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
	if ((sinkId === "default") || (sinkId === "communications")) {
		activeDevice = sinkId;
	} else {
		activeDevice = deviceName;
	}
	// Update all elements on the page with the new sinkId.
	await injectSinkId();
	return true;
}

async function init() {
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
