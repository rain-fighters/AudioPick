// Prefix used for our local storage variables.
const storagePrefix = "preferredDevice_";
var tabError = ""
var activeTab;
var domainString;
// Assume all devices are the system default until proven otherwise.
var domainDevice = "default";
var activeDevice = "default";

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

// Clear all our microphone contentSettings.
// Sadly there is no way to just clear our setting for a
// specific pattern (site), but we might still use this
//   - either whenever the popup is opened
//   - or via an UI element (button) in the poopup.
// TODO. Decide, how/whether to use this.
async function clearMicAccess() {
	await chrome.contentSettings.microphone.clear({
		scope: (
			activeTab.incognito
			? "incognito_session_only"
			: "regular"
		)
	});
	return true;
}

// OnChange handler for our debug checkbox
function checkbox_OnChange(e) {
	console.log("checkbox_OnChange: ", e, e.target.id)
	if (e.target.checked === true) {
		chrome.storage.local.set({"enableDebug": true});
	} else {
		chrome.storage.local.set({"enableDebug": false});
	}
	// Don't try to pass a boolean here ... JavaScript sucks!
	chrome.tabs.sendMessage(activeTab.id, {
		action: "updateDebug",
		value: e.target.checked ? "yes" : "no"
	});
}

// Click handler used for all buttons on the popup.
function button_OnClick(e) {
	// Just close the window, when cancel has been clicked,
	if (e.target.id === "cancel") {
		window.close();
		return;
	}
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
	if ((selected.id === "default") || (selected.id === "communications")) {
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
		// If we're here because the user clicked the "applyStar" button,
		// we save the selection as "preferred" to the local storage.
		if (e.target.id === "applyStar") {
			chrome.storage.local.set({[domainString]: activeDevice });
		}
		// Close the popup.
		window.close();
	});
}

function addDeviceRow(table, deviceId, deviceLabel, isActive, isPreferred, isDisabled) {
	var row = table.insertRow(-1);
	var cell0 = row.insertCell(0);
	var cell1 = row.insertCell(1);
	var cell2 = row.insertCell(2);
	var radioElement = document.createElement("input");
	var labelElement = document.createElement("label");
	var textNode = document.createTextNode("");
	radioElement.type = "radio";
	radioElement.name = "device";
	radioElement.id = deviceId;
	// We use the device label as the activeDevice we pass to the tab.
	radioElement.value = deviceLabel;
	radioElement.checked = isActive;
	radioElement.disabled = isDisabled;
	if (isDisabled) { row.classList.add("disabled"); }
	// Make standard label for default devices & use provided for rest.
	switch (deviceId) {
		case "default":
			textNode.textContent = "Default Audio Device";
			break;
		case "communications":
			textNode.textContent = "Default Communications Device";
			break;
		default:
			textNode.textContent = deviceLabel;
	}
	labelElement.htmlFor = deviceId;
	labelElement.appendChild(textNode);
	cell0.appendChild(radioElement);
	cell1.appendChild(labelElement);
	if (isPreferred) {
		cell2.innerHTML = "&#9733"; // star
	} else {
		cell2.innerHTML = "&nbsp;"; // blank
	}
}

function buildDeviceTable(mediaDeviceInfo) {
	var activeExists = false;
	var domainExists = false;
	var table = document.getElementById("device_options");

	// Remove all existing rows from the device table.
	while (table.rows.length > 0) { table.deleteRow(0); }

	// Check, if we (still) find the tab's activeDevice and its domain's
	// possibly stored "preferred device" (domainDevice) in our current
	// list of "audiooutput" devices.
	mediaDeviceInfo.forEach(function (device) {
		if (device.kind === "audiooutput") {
			activeExists = activeExists ||
				(device.label === activeDevice) || (device.deviceId === activeDevice);
			domainExists = domainExists ||
				(device.label === domainDevice) || (device.deviceId === domainDevice);
		}
	});
	// Pick the best match (active > domain > "default") from the list of EXISTING
	// "audiooutput" devices, so that it gets pre-checked in the device table.
	if (!activeExists) {
		if (domainExists) {
			activeDevice = domainDevice;
		} else {
			activeDevice = "default";
		}
	}

	// Generate our device entries.
	mediaDeviceInfo.forEach(function (device) {
		// Filter out input devices.
		if (device.kind === "audiooutput") {
			var isActive = false;
			var isPreferred= false;
			if (tabError === "") { // tab is valid and has a content script
				// Is this the tab's activeDevice?
				if ((device.label === activeDevice) || (device.deviceId === activeDevice)) {
					isActive = true;
				}
				// Is this the tab domain`s preferred/starred device?
				if ((device.label === domainDevice) || (device.deviceId === domainDevice)) {
					isPreferred = true;
				}
			}
			addDeviceRow(table, device.deviceId, device.label, isActive, isPreferred, (tabError !== ""));
		}
	});
	// If the preferred device no longer exists, e. g. was removed or renamed,
	// we add a disabled entry indicating this to the user.
	if (domainDevice && !domainExists) {
		addDeviceRow(table, "unknownId", domainDevice, false, true, true);
	}
}

async function init() {
	var status = document.getElementById("status_message");
	var checkbox = document.getElementById("checkbox_debug");
	var result = await chrome.storage.local.get("enableDebug");
	if (result && result.enableDebug) {
		checkbox.checked = true;
	} else {
		checkbox.checked = false;
	}
	checkbox.onchange = checkbox_OnChange;
	// Get the current active / calling tab.
	[activeTab] = await chrome.tabs.query({
		active: true,
		currentWindow: true
	});
	// Check whether the tab has a valid (HTTPS) URL.
	if (!activeTab.url || (activeTab.url.toLowerCase().indexOf("https") === -1)) {
		tabError = "Invalid URL. Not HTTPS.";
	}
	if (tabError === "") {
		// Generate domain storage name from tab URL.
		domainString = storagePrefix + activeTab.url.split("/")[2];
		// Retrieve domain settings if they exist.
		const storage = await chrome.storage.local.get([domainString]);
		if (storage[domainString]) {
			domainDevice = storage[domainString];
			// Nope, we should not assume this!
			// activeDevice = domainDevice;
		}
		// Get the active device from the current tab.
		try {
			const response = await chrome.tabs.sendMessage(activeTab.id, {
				action: "getActiveDevice"
			});
			if (response) {
				activeDevice = response;
			}
		} catch(error) {
			tabError = "Content Script not reponding. Try reload.";
		}
	}
	if (tabError === "") {
		// Get the site's Permissions-Policy for microphone access.
		try {
			const response = await chrome.tabs.sendMessage(activeTab.id, {
				action: "getMicPolicy"
			});
			if (response === "denied")  {
				tabError = "Site denies microphone access.";
			}
		} catch(error) {
			tabError = "Content Script not reponding. Try reload.";
		}
	}
	// Display the current tab status/error.
	status.innerHTML = tabError;

	// Clear all microphone access permissions managed by our extension
	// TODO: Decide whether to call this here, call it via a popup button
	// or not at all.
	// await clearMicAccess();

	// Set our extensions microphone access permissions so we (the popup)
	// can access non-default audio devices when we list them.
	await setMicAccess("*://" + chrome.runtime.id + "/*", "allow");
	// Get the current list of audio devices.
	const deviceList = await navigator.mediaDevices.enumerateDevices();
	// Build the popup's device table.
	buildDeviceTable(deviceList);
	// Set the onClick handler for all buttons and disable
	// all but the "cancel" button, if tabError !== "".
	Array.from(document.getElementsByTagName("button")).forEach(function (e) {
		if ((tabError === "") || (e.id === "cancel")) {
			e.disabled = false;
			e.onclick = button_OnClick;
		} else {
			e.disabled = true;
			e.onclick = "";
		}
	});
}

init();
