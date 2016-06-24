/*
 * $Id: background.js 49 2016-05-18 05:11:10Z  $
 */

 'use strict';
  
 var stored_id = 'default'
 var stored_no = 0;
 var extension_id = chrome.runtime.id;
 
 // Haha, it seems we no longer need getUserMedia() ...
chrome.contentSettings['microphone'].set({'primaryPattern':'*://' + extension_id + '/*','setting':'allow'});

chrome.runtime.onMessage.addListener(
	function (message, sender, sendResponse) {
		if (message.method == "AP_get_default_no") {
			log('Received message: ' + message.method + ' from frame ' + sender.frameId + ' on tab ' + sender.tab.id);
			if (sender.frameId != 0 ) {
				log('Asking top frame: report_sink_no');
				chrome.tabs.sendMessage(sender.tab.id,
					{"message": "report_sink_no"},
					{'frameId': 0},  // request from top frame
					function(response) {
						if (response) {
							var default_no = document.getElementById("default_no");
							log("Received Response from top frame: " + response.sink_no);
							if (response.sink_no != 0) {
								log('Reply to sub frame ' + sender.frameId + ' with: top sink_no: ' + response.sink_no);
								sendResponse({'default_no': response.sink_no});
							} else {
								log('Reply to sub frame ' + sender.frameId + ' with: default_no: ' + default_no.value);
								sendResponse({'default_no': default_no.value});
							}
						}
					}
				);
			} else {
				var default_no = document.getElementById("default_no");
				log('Reply with: default_no: ' + default_no.value);
				sendResponse({'default_no': default_no.value});
			}
		} else if (message.method == "AP_help_with_GUM") {
			log('Received message: ' + message.method + ', primaryPattern: ' + message.primaryPattern);
			chrome.contentSettings['microphone'].set({'primaryPattern': message.primaryPattern,'setting':'allow'});
			log('Reply with: result: ' + 'Have fun!');
			sendResponse({'result': 'Have fun!'});
		}
		return true;
    }
 )
 
// -- Use declarativeContent to only enable the page_action ... does not work properly (the PageStateMatcher does not)
// -- We could actually switch back to a browser action
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
	// We no longer need getUserMedia(), because we have written our extension id to contentSettings['microphone']
/*
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
*/
	navigator.mediaDevices.enumerateDevices()
		.then(update_device_cache)
		.catch(errorCallback);
}

function errorCallback(error) {
	log('error: '+ error);
}

function log(message) {
	console.log('background: ' +  message);
}
                                                                                                                                                                                                                                                                                                           
function update_device_cache(deviceInfos) {
	var default_no = document.getElementById("default_no");
	var select = document.getElementById('device_cache');
	log('update_device_cache: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	for (var i = 0; i !== deviceInfos.length; ++i) {
		var kind = deviceInfos[i].kind;
		var id = deviceInfos[i].deviceId;
		var text = deviceInfos[i].label;
		//log('device: ' + id + ' - ' + text);
		if (kind === 'audiooutput') {
			if (id == "default") {
				if (stored_no == 0) {
					stored_no = i;
					default_no.value = stored_no;
				}
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
