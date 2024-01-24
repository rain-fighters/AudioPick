// Content script handles:
// 1) Loading and applying saved devices.
// 2) Listening for device change messages from popup/worker.
// Content script runs in WORLD:ISOLATED.

// Prefix used for our local storage variables.
const storagePrefix = "preferredDevice_";

// Assume active device is system default until proven otherwise.
var activeDevice = "default";
var activeSinkId;

// Write to console.log, if debugging is enabled.
function debugMessage(...args) {
	chrome.storage.local.get(["enableDebug"]).then(function(result) {
		if (result && result.enableDebug) {
			console.log('APV3-content.js (' +
				((window === top) ? 'top-origin: ' : 'sub-origin: ') +
				window.location.origin + ')', ...args);
		}
	});
}

// Inject the enableDebug value into MAIN (all_frames) via worker
async function injectDebug(enableDebug) {
	await chrome.runtime.sendMessage({
		action: "injectDebug",
		value: enableDebug
	});
}

// Messages are expected in the format {action: value, ...}
function onMessage(request, sender, sendResponse) {
	switch (request.action) {
	case "updateDebug":
		// The extension popup has changed chrome.storage.local["enableDebug"].
		injectDebug(request.value);
		break;
	case "setActiveDevice":
		// The extension popup is asking us (top and children) to set a new active device.
		debugMessage("| onMessage: setActiveDevice | sendAudioDevice:", request.device);
		setAudioDevice(request.device);
		break;
	case "getActiveDevice":
		// The exension popup or a child of this tab (via worker)
		// is asking for the activeDevice.
		if (window === top) { // only respond when top
			debugMessage("| onMessage: getActiveDevice | sendResponse:", activeDevice);
			sendResponse(activeDevice);
		}
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
		if (window === top) { // only respond when top
			navigator.permissions.query({name: "microphone"}).then(function(result) {
				sendResponse(result.state);
			});
			// We need to return true from onMessage() to keep the channel open,
			// since our sendReponse() is called asynchronously here.
			return true;
		}
	}
}

async function wakeupWorker() {
	try {
		await chrome.runtime.sendMessage({
			action: "wakeup",
			value: "now"
		});
	} catch {
		debugMessage("| wakeupWorker: Worker is hopefully awake now.");
	}
	return true;
}

// Send the new/selected sinkId to MAIN.
async function injectSinkId() {
	var micPolicy = await navigator.permissions.query({ name: "microphone" });
	debugMessage("| injectSink:", activeSinkId, "| micPolicy.state:", micPolicy.state);
	if (micPolicy.state === "denied") {
		// Do not try to get microphone access and/or change sinkIds.
		return;
	}
	// If we're setting the device to something non-default get Mic access.
	if (activeSinkId && (activeSinkId !== "default")) {
		// NOTE that the worker uses top's domain (sender.tab.url) to grant
		// permission to, not the child's (iframe's).
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
}

// Set the specified device as the audio sink for all elements.
async function setAudioDevice(deviceName) {
	var mediaDeviceInfo;
	var sinkId = "default";
	var micPolicy = await navigator.permissions.query({ name: "microphone" });
	debugMessage("| setAudioDevice:", deviceName, "| micPolicy.state:", micPolicy.state);
	if (micPolicy.state === "denied") {
		// Do not try to get microphone access and/or change sinkIds.
		return;
	}
	// Send a dumnmy message to wake up the service worker
	// This is a hack/workaround for a chrome bug on linux
	await wakeupWorker();
	// If the target device is the system default skip straight to applying.
	if (deviceName !== "default") {
		// If we're setting it to anything other than the system default
		// make sure we have microphone access before we proceed.
		// NOTE that the worker uses top's domain (sender.tab.url) to grant
		// permission to, not the child's (iframe's).
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
}

async function init() {
	// Inject enableDebug setting into MAIN
	const result = await chrome.storage.local.get(["enableDebug"]);
	if (result && result.enableDebug) {
		await injectDebug(true);
	} else {
		await injectDebug(false);
	}
	if (window === top) {
		// If we are top, check for a stored/starred activeDevice.
		const domainString = storagePrefix + window.location.hostname;
		const storage = await chrome.storage.local.get([domainString]);
		if (storage[domainString]) {
			activeDevice = storage[domainString];
		}
	} else {
		// If we are sub, request the activeDevice from top via worker.
		const sleep = function(milliseconds) {
			return new Promise((resolve) => setTimeout(resolve, milliseconds));
		}
		// Max 3 attempts with 200ms wait before trying
		for (let tries = 3; tries > 0; tries--) {
			await sleep(200);
			activeDevice = await chrome.runtime.sendMessage({action: "getActiveDeviceBG"});
			if (activeDevice) { break; }
		}
		if (!activeDevice) {
			debugMessage("| init: top content script not responding. Giving up.");
			return;
		}
	}
	// Start listening for messages.
	debugMessage("| init: addListener(onMessage)");
	chrome.runtime.onMessage.addListener(onMessage);
	await setAudioDevice(activeDevice);
}

init();
