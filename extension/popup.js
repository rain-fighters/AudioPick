/*
 * $Id: popup.js 49 2016-05-18 05:11:10Z  $
 */
 
'use strict';
 
var bg = chrome.extension.getBackgroundPage();
var default_no = bg.document.getElementById("default_no");
var sink_no = default_no.value;

// -- Update the temporary device selection page 
 function init() {
	log('init');
 	chrome.tabs.query({active: true, currentWindow: true},
		function(tabs) {
			var activeTab = tabs[0];
			log('Sending message: report_sink_no');
			chrome.tabs.sendMessage(activeTab.id,
				{"message": "report_sink_no"},
				{'frameId': 0}, // only request from main frame
				function(response) {
					if (response) {
						log("Received Response: " + response.sink_no);
						sink_no = response.sink_no;
					}
					navigator.mediaDevices.enumerateDevices()
						.then(update_device_popup)
						.catch(errorCallback);
				}
			);
		}
	)
}

function errorCallback(error) {
	log('error: ', error);
}

function log(message) {
	// logging to background console
	bg.console.log('popup: ' +  message);
}

function update_device_popup(deviceInfos) {
	log('update_device_popup: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	var div = document.getElementById("device_options");
	var select = bg.document.getElementById("device_cache");
	while (div.firstChild) { div.removeChild(div.firstChild); }
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
			var option = bg.document.getElementById(id);
			if (!text) {
				if (option && option.value) {
					text = option.value;
				} else {
					text = id;
				}
			}
			if (option) {
				option.value = text;
			} else {
				option = bg.document.createElement("option");
				option.id = id;
				option.value = text;
				select.appendChild(option);				
			}
			var input = document.createElement("input");
			input.type= "radio";
			input.name = "device";
			input.id = id;
			input.value = i;
			input.onchange = function(e){input_onchange(e);};
			var textNode = document.createTextNode(text);
			var label = document.createElement("label");
			if (i == sink_no) {
				log('current default_no: ' + i + ' - ' + id + ' - ' + text);
				input.checked = true;
			}			
			label.appendChild(textNode);
			label.appendChild(input);
			div.appendChild(label);
		}
	}
}

function input_onchange(e) {
	//log('PageAction Commit');
	var sink_no = e.target.value;	
	chrome.tabs.query({active: true, currentWindow: true},
		function(tabs) {
			var activeTab = tabs[0];
			log('Sending message: page_action_commit, sink_no: ' + sink_no);
			chrome.tabs.sendMessage(activeTab.id, { // send to all frames without using options = {'frameId': N} 
				"message": "page_action_commit",
				"sink_no":  sink_no
			});
			window.close();
		}
	);
};

// -- main ---------------------------------------------------------------
init();

