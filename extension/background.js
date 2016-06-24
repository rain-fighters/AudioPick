/*
 * $Id: background.js 41 2016-05-17 01:02:15Z  $
 */

 'use strict';
  
 var stored_id = 'default'
 var stored_no = 0;
 
chrome.runtime.onMessage.addListener(
	function (message, sender, sendResponse) {
		log('Received message: ' + message.method);
		if (message.method == "AP_get_default_no") {
			var default_no = document.getElementById("default_no");
			log('Reply with: default_no: ' + default_no.value);
			sendResponse({'default_no': default_no.value});
		}
    }
 )
 
// -- Use declarativeContent to only enable the page_action when the page is served via HTTPS
// -- and contains <video/> and/or <audio/> elements 
chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: { schemes: ['https','http']},
				}),
			],
			actions: [new chrome.declarativeContent.ShowPageAction() ]
		}]);
	});
});

// -- Initialize device_cache (list of available devices)
function init() {
	var default_no = document.getElementById("default_no");
	default_no.value = stored_no;
	// We could include the around 2500 lines of code from WebRTCs "adapter.js"
	// and then call "navigator.mediaDevices.getUserMedia()", but why should we?
	navigator.webkitGetUserMedia(
		{
			audio:true,
			video:false
		},
		function(stream) {
			log('getUserMedia: success (as it should be, after being helped by options full page)');
			navigator.mediaDevices.enumerateDevices()
				.then(update_device_cache)
				.catch(errorCallback);
		},
		function(stream) {
			log('getUserMedia: error (as is expected, before being helped by options full page)');
			navigator.mediaDevices.enumerateDevices()
				.then(update_device_cache)
				.catch(errorCallback);
		}
	);
}

function errorCallback(error) {
	log('error: '+ error);
}

function log(message) {
	console.log('background: ' +  message);
}
                                                                                                                                                                                                                                                                                                           
function update_device_cache(deviceInfos) {
	log('update_device_cache: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	var select = document.getElementById('device_cache');
	for (var i = 0; i !== deviceInfos.length; ++i) {
		var kind = deviceInfos[i].kind;
		var id = deviceInfos[i].deviceId;
		var text = deviceInfos[i].label;
		//log('device: ' + id + ' - ' + text);
		if (kind === 'audiooutput') {
			if (id == "default") {
				text = "System Default Device";
			} else if (id == "communications") {
				text = "System Default Communications Device";
			}
			//log('audiooutput: ' + id + ' - ' + text);
			if (text) { // only update/write cache, when we have a device label
				var option = document.getElementById(id)
				if (option) {
					option.value = text;
				} else {
					option = document.createElement("option");
					option.id = id;
					option.value = text;
					select.appendChild(option);				
				}
			}
		}
	}
}

// -- main ---------------------------------------------------------------
chrome.storage.local.get("AP_default_no",
	function(result) {
		stored_no = result["AP_default_no"];
		if (!stored_no) { stored_no = 0; }
		log('stored_no: '+ stored_no);
		init();
	}
);
