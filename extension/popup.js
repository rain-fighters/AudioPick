// Prefix used for our local storage variables.
const storagePrefix = "preferredDevice_";
// Assume all devices are the system default until proven otherwise.
var domainDevice = "default";
var activeDevice = "default";
var activeTab;
var domainString;

// Sets microphone access using contentSettings API.
async function setMicAccess(pattern, value) {
	await chrome.contentSettings.microphone.set({
		primaryPattern: pattern,
		scope: (
			activeTab.incognito
			? "incognito_session_only"
			: "regular"
		),
		setting: value
	});
	return true;
}

// Click handler used for all buttons on the pop-up.
function button_OnClick(e) {
	// Check which device has been selected.
	var selected = document.querySelectorAll("input[type='radio']:checked")[0];
	// Create domain pattern in case we need to set Mic access.
	var micPattern = activeTab.url.split("/")[0] + "//";
	micPattern = micPattern + activeTab.url.split("/")[2] + "/*";
	if (selected.id === "default") {
		// If the default device is selected we don't need Mic access.
		// Set permission for site back to "ask".
		setMicAccess(micPattern, "ask");
	}
	if (selected.id === "default" || selected.id === "communications") {
		// If the default audio or comms device was selected we use their ID.
		// This avoids mismatches when they change defaults.
		activeDevice = selected.id;
	} else {
		// If a non-default device was selected use the device label.
		// Allows us to select the right device between tabs when IDs change.
		activeDevice = selected.value;
	}
	// Tell the active tab to set the newly selected active device.
	chrome.tabs.sendMessage(activeTab.id, {
		action: "setActiveDevice",
		device: activeDevice
	}).then(function () {
		// If we're here because the user clicked a save button then
		// we should save the selection to the relevant local storage.
		switch (e.target.id) {
		case "saveSite":
			chrome.storage.local.set({[domainString]: activeDevice });
			break;
		}
		// Close the pop-up now that a selection has been made.
		window.close();
	});
}

// Build the elements for our popup from the list of devices.
function buildDeviceList(mediaDeviceInfo) {
	var activeExists = false;
	var domainExists = false;
	// Select the element from the HTML we will use as our parent.
	var mainElement = document.getElementById("device_options");
	// Check if any of the active/domain default/default devices exist.
	mediaDeviceInfo.every(function (device) {
		activeExists = (!activeExists && (
			(
				device.label === activeDevice
			) || (
				device.deviceId === activeDevice
			)
		));
		domainExists = (!domainExists && (
			(
				device.label === domainDevice
			) || (
				device.deviceId === domainDevice
			)
		));
		return !activeExists;
	});
	// Use saved device in order of preference (active > domain > default).
	if (!activeExists) {
		if (domainExists) {
			activeDevice = domainDevice;
		} else {
			activeDevice = "default";
		}
	}
	// Remove any existing children from parent.
	mainElement.childNodes.forEach((node) => node.remove());
	// Generate our device entries.
	mediaDeviceInfo.forEach(function (device) {
		var desc;
		var radioElement = document.createElement("input");
		var labelElement = document.createElement("label");
		var textNode = document.createTextNode("");
		// Filter out input devices.
		if (device.kind === "audiooutput") {
			radioElement.type = "radio";
			radioElement.name = "device";
			radioElement.id = device.deviceId;
			switch (device.deviceId) {
			// Make standard label for default devices & use provided for rest.
			case "default":
				desc = "Default Audio Device";
				break;
			case "communications":
				desc = "Default Communications Device";
				break;
			default:
				desc = device.label;
			}
			// We use the device label as the identifier we pass to the tab.
			radioElement.value = device.label;
			// Bold the entry for the active device for a visual indicator.
			if (
				(
					device.label === activeDevice
				) || (
					device.deviceId === activeDevice
				)
			) {
				radioElement.checked = true;
				labelElement.style.fontWeight = "bold";
			}
			// The default device for the domain is purple and italic.
			if (
				(
					device.label === domainDevice
				) || (
					device.deviceId === domainDevice
				)
			) {
				labelElement.style.fontStyle = "italic";
				labelElement.style.color = "purple";
			}
			// Set text and append elements.
			textNode.textContent = desc;
			labelElement.appendChild(radioElement);
			labelElement.appendChild(textNode);
			mainElement.appendChild(labelElement);
		}
	});
	// Set the onClick handler for all buttons on the page.
	Array.from(document.getElementsByTagName("button")).forEach(function (e) {
		e.onclick = button_OnClick;
	});
}

async function init() {
	// Get the current active / calling tab.
	[activeTab] = await chrome.tabs.query({
		active: true,
		currentWindow: true
	});
	// If we're not on http or https immediately close.
	// Extension doesn't like to work on chrome:// or file:// URLs.
	if (!activeTab.url || (activeTab.url.toLowerCase().indexOf("http") === -1)) {
		window.close();
		return;
	}
	// Generate domain storage name from tab URL.
	domainString = storagePrefix + activeTab.url.split("/")[2];
	// Retrieve domain settings if they exist.
	const storage = await chrome.storage.local.get([domainString]);
	if (storage[domainString]) {
		domainDevice = storage[domainString];
		activeDevice = domainDevice;
	}
	// Get the active device from the current tab.
	const response = await chrome.tabs.sendMessage(activeTab.id, {
		action: "getActiveDevice"
	});
	if (response) {
		activeDevice = response;
	}
	// Set our extensions microphone access permissions so we can
	// access non-default audio devices when we list them.
	await setMicAccess("*://" + chrome.runtime.id + "/*", "allow");
	// Get the current list of audio devices.
	const deviceList = await navigator.mediaDevices.enumerateDevices();
	// Build pop-up interface.
	buildDeviceList(deviceList);
}

init();
