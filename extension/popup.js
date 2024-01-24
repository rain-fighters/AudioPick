// Prefix used for our local storage variables.
const storagePrefix = "preferredDevice_";
var tabError = "";
var micPolicy = "unknown";
var activeTab;
var domainString;
// Assume all devices are the system default until proven otherwise.
var domainDevice = "default";
var activeDevice = "default";

// Write to console.log, if debugging is enabled.
function debugMessage(...args) {
	chrome.storage.local.get(["enableDebug"]).then(function(result) {
		if (result && result.enableDebug) {
			console.log('APV3-popup.js', ...args);
		}
	});
}

// OnChange handler for our smart checkbox
function checkboxSmart_OnChange(e) {
	if (e.target.checked === true) {
		chrome.storage.local.set({"enableSmart": true});
	} else {
		chrome.storage.local.set({"enableSmart": false});
	}
}

// OnChange handler for our debug checkbox
function checkboxDebug_OnChange(e) {
	if (e.target.checked === true) {
		chrome.storage.local.set({"enableDebug": true});
	} else {
		chrome.storage.local.set({"enableDebug": false});
	}
	chrome.tabs.sendMessage(activeTab.id,
		{action: "updateDebug", value: e.target.checked}
	).catch(function() {
		// Do nothing.
		// There might be no content script running in the target tab.
	});
}

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

// Throw away all microphone permissions managed by us and re-acquire access
// - for domains wich have stored/starred non-default devices
// - for domains from any (currently open) secure (https) tab
//   with a non-default activeDevice
// - and for ourselves
// Optionally exclude the (id of the) activeTab for which we are about
// to set a possibly new device which may no longer require access.
async function smartMicAccess(excludedTabId) {
	const clearMicAccess = async function() {
		await chrome.contentSettings.microphone.clear({
			scope: (
				activeTab.incognito
				? "incognito_session_only"
				: "regular"
			)
		});
		return true;
	}
	// Remove all microphone permissions managed by us
	await clearMicAccess();
	// (Re-)Acquire extension's microphone access so we (the popup)
	// can access non-default audio devices when we list them.
	await setMicAccess("*://" + chrome.runtime.id + "/*", "allow");
	// Re-acquire microphone access for domains
	// with a stored/starred non-default device.
	let items = await chrome.storage.local.get(null);
	for (let [key, value] of Object.entries(items)) {
		if (key.startsWith(storagePrefix)) {
			if (value !== "default") {
				let micPattern = "https://" + key.replace(storagePrefix, "") + "/*";
				debugMessage("| smartMicAccess(starredDom): allow:", micPattern);
				await setMicAccess(micPattern, "allow");
			}
		}
	}
	// Re-acquire microphone access for domains
	// from secure tabs with a non-default device.
	let secureTabs = await chrome.tabs.query({ url: "https://*/*" });
	secureTabs.forEach(async function(tab) {
		let micPattern = "https://" + tab.url.split("/")[2] + "/*";
		if (tab.id === excludedTabId) {
			debugMessage("| smartMicAccess(secureTabs): skip excluded:", micPattern);
			return;
		}
		try {
			const response = await chrome.tabs.sendMessage(tab.id, {
				action: "getActiveDevice"
			});
			if (response && (response !== "default")) {
				debugMessage("| smartMicAccess(secureTabs): allow:", micPattern);
				await setMicAccess(micPattern, "allow");
			}
		} catch {
			debugMessage("| smartMicAccess(secureTabs): no response:", micPattern);
		}
	});
	return true;
}

// Click handler used for all buttons on the popup.
function button_OnClick(e) {
	// Just close the window, when cancel has been clicked.
	if (e.target.id === "cancel") {
		window.close();
		return;
	}
	let selected = document.querySelectorAll("input[type='radio']:checked")[0];
	// Remove stored/starred device for domain, if reverting to "default".
	if ((e.target.id === "applyStar") && (selected.id === "default")) {
		chrome.storage.local.remove([domainString]);
	}
	let checkboxSmart = document.getElementById("checkbox_smart");
	if (!checkboxSmart.checked) {
		// If the default device is selected, we don't need microphone access.
		// Note that this still marks the microphone permission as managed
		// by the extension, i. e. it cannot be changed by the user.
		// That's one reason, we added smartMicAccess() ...
		if (selected.id === "default") {
			let micPattern = activeTab.url.split("/")[0] + "//";
			micPattern = micPattern + activeTab.url.split("/")[2] + "/*";
			setMicAccess(micPattern, "ask");
		}
	} else {
		// Do not re-acquire microphone permissions for the activeTab,
		// since we are doing this implicitely (when needed) below
		// through sending a "setActiveDevice" message.
		smartMicAccess(activeTab.id);
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
		if ((e.target.id === "applyStar") && (activeDevice !== "default")) {
			chrome.storage.local.set({[domainString]: activeDevice });
		}
		// Close the popup.
		window.close();
	});
}

function addTitleRow(table, url, isDisabled) {
	const siteUrl = function(url) {
		if (typeof url === 'undefined') {
			url = "undefined://undefined";
		}
		let proto = url.split("/")[0];
		let host = url.split("/")[2];
		if (proto === "https:") {
			return url.split("/")[2];
		} else {
			return proto + "//" + host;
		}
	};
	const favIconUrl = function(url) {
		if (typeof url === 'undefined') {
			// A dedicated icon would be better, but this is
			// a really rare case, e. g. opening a tab for
			// "chrome-extension://" + chrome.runtime.id + "/popup.html"
			return "./APV3_Icon_2d_2c_32.png";
		}
		const query = new URL(chrome.runtime.getURL("/_favicon/"));
		query.searchParams.set("pageUrl", url);
		query.searchParams.set("size", "32");
		return query.toString();
	};
	const svgMicDeny = `
		<svg xmlns="http://www.w3.org/2000/svg"
			width="24" height="24" viewBox="0 0 24 24" fill="none"
			stroke="currentColor" stroke-width="2" stroke-linecap="round"
			stroke-linejoin="round" class="lucide lucide-mic-off">
			<line x1="2" x2="22" y1="2" y2="22"/>
			<path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
			<path d="M5 10v2a7 7 0 0 0 12 5"/>
			<path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
			<path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
			<line x1="12" x2="12" y1="19" y2="22"/>
		</svg>
	`;
	const svgMicDefault = `
		<svg xmlns="http://www.w3.org/2000/svg"
			width="24" height="24" viewBox="0 0 24 24" fill="none"
			stroke="currentColor" stroke-width="2" stroke-linecap="round"
			stroke-linejoin="round" class="lucide lucide-mic">
			<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
			<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
			<line x1="12" x2="12" y1="19" y2="22"/>
		</svg>
	`;
	let row = table.insertRow(-1);
	let cell0 = row.insertCell(0);
	let cell1 = row.insertCell(1);
	let cell2 = row.insertCell(2);
	let site = siteUrl(url);
	let siteIcon = favIconUrl(url);
	let imageNode = document.createElement("img");
	let textNode = document.createTextNode(site + " - mic:" + micPolicy);
	imageNode.src = siteIcon;
	cell0.appendChild(imageNode);
	cell1.appendChild(textNode);
	if (isDisabled) {
		row.classList.add("disabled");
		// micPolicy is either "unknown" or "denied"
		cell2.innerHTML = svgMicDeny;
	} else {
		// micPolicy is either "prompt" or "granted"
		cell2.innerHTML = svgMicDefault;
	}
	cell2.classList.add("micPolicy-" + micPolicy);
}

function addDeviceRow(table, deviceId, deviceLabel, isActive, isPreferred, isDisabled) {
	const reDevicePrefix = /^\s*\S+\s*-\s*/i;
	let row = table.insertRow(-1);
	let cell0 = row.insertCell(0);
	let cell1 = row.insertCell(1);
	let cell2 = row.insertCell(2);
	let radioElement = document.createElement("input");
	let labelElement = document.createElement("label");
	radioElement.type = "radio";
	radioElement.name = "device";
	radioElement.id = deviceId;
	// Store the deviceLabel as radioElement.value so we can
	// pass it to the activeTab as the (new) activeDevice.
	radioElement.value = deviceLabel;
	radioElement.checked = isActive;
	radioElement.disabled = isDisabled;
	if (isDisabled) {
		row.classList.add("disabled");
	}
	// Make standard label for default devices & use provided for rest.
	// On Windows and possibly MacOS the device labels for "default" and
	// "communications" look like "Default|Communications - ACTUAL_DEVICE_NAME",
	// but on Linux it's just "Default" ("communications" does not even exist).
	// The following handles both cases.
	let deviceSuffix = deviceLabel.replace(reDevicePrefix, ''); /* Strip prefix, if there is one*/
	if ((deviceId === "default") && (deviceSuffix !== deviceLabel)) {
		labelElement.innerHTML = 'Default <span>- ' + deviceSuffix + '</span>';
	} else if ((deviceId === "communications") && (deviceSuffix !== deviceLabel)) {
		labelElement.innerHTML = 'Communications <span>- ' + deviceSuffix + '</span>';
	} else {
		labelElement.innerHTML = deviceLabel;
	}
	labelElement.htmlFor = deviceId;
	cell0.appendChild(radioElement);
	cell1.appendChild(labelElement);
	if (isPreferred) {
		cell2.innerHTML = "&#9733"; // star
	} else {
		cell2.innerHTML = "&nbsp;"; // blank
	}
}

function buildDeviceTable(mediaDeviceInfo) {
	let activeExists = false;
	let domainExists = false;
	let table = document.getElementById("device_options");
	// Remove all existing rows from the device table.
	while (table.rows.length > 0) { table.deleteRow(0); }
	// Show information about the activeTab's site in the first row,
	// i. e. site (host/domain-name), favIcon and micPolicy
	addTitleRow(table, activeTab.url, (tabError !== ""));
	// Check, if we (still) find the tab's activeDevice and its domain's
	// possibly stored "preferred device" (domainDevice) in our current
	// list of "audiooutput" devices.
	mediaDeviceInfo.forEach(function (device) {
		// Filter out input devices.
		// We no longer offer the "communications" device, but we still
		// handle it as a special case everywhere else, e. g. remember
		// the device.deviceId instead of device.label.
		if ((device.kind === "audiooutput") && (device.deviceId !== "communications")) {
			activeExists = activeExists ||
				(device.label === activeDevice) || (device.deviceId === activeDevice);
			domainExists = domainExists ||
				(device.label === domainDevice) || (device.deviceId === domainDevice);
		}
	});
	// Pick the best match (active > domain > "default") from the list of EXISTING
	// "audiooutput" devices, so that it gets pre-selected/checked in the device table.
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
		// We no longer offer the "communications" device, but we still
		// handle it as a special case everywhere else, e. g. remember
		// device.deviceId instead of device.label.
		if ((device.kind === "audiooutput") && (device.deviceId !== "communications")) {
			let isActive = false;
			let isPreferred = false;
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
	// we add a disabled entry to signal this fact to the user.
	if (domainDevice && !domainExists) {
		addDeviceRow(table, "unknownId", domainDevice, false, true, true);
	}
}

async function init() {
	let status = document.getElementById("status_message");
	let checkboxDebug = document.getElementById("checkbox_debug");
	let checkboxSmart = document.getElementById("checkbox_smart");
	let storageResult = await chrome.storage.local.get(["enableDebug", "enableSmart", "lastAnimated"]);
	if (storageResult && storageResult.enableDebug) {
		checkboxDebug.checked = true;
	} else {
		checkboxDebug.checked = false;
	}
	checkboxDebug.onchange = checkboxDebug_OnChange;
	if (storageResult && storageResult.enableSmart) {
		checkboxSmart.checked = true;
	} else {
		checkboxSmart.checked = false;
	}
	checkboxSmart.onchange = checkboxSmart_OnChange;
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
		}
		// Get the active device from the current tab.
		try {
			const response = await chrome.tabs.sendMessage(
				activeTab.id, {action: "getActiveDevice"}, {frameId: 0});
			if (response) {
				activeDevice = response;
			}
		} catch {
			tabError = "Content Script not reponding. Try reload.";
		}
	}
	if (tabError === "") {
		// Get the site's Permissions-Policy for microphone access.
		try {
			const response = await chrome.tabs.sendMessage(
				activeTab.id, {action: "getMicPolicy"}, {frameId: 0});
			micPolicy = response;
			if (response === "denied")  {
				tabError = "Site denies microphone access.";
			}
		} catch {
			tabError = "Content Script not reponding. Try reload.";
		}
	}
	// Display the current tab status/error.
	status.innerHTML = tabError;
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
	if (storageResult) {
		let now = Date.now() / 1000.0; // [seconds]
		// Enable animation only once every hour (3600 seconds)
		// Note that @media (prefers-reduced-motion) still disables animations entirely.
		if (!storageResult.lastAnimated || ((now - storageResult.lastAnimated) > 3600.0)) {
			document.querySelectorAll("header div").forEach(function(div) {
				div.classList.add("animation-enabled");
			});
			chrome.storage.local.set({"lastAnimated": now});
		}
	}
}

init();
