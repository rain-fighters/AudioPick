/*
 * $Id: options.js 36 2016-05-15 23:06:46Z  $
 */
 
var bg = chrome.extension.getBackgroundPage();
 
// -- Help the background page in retrieving devices and update the default device selection page 
 function init() {
 	// We could include the around 2500 lines of code from WebRTCs "adapter.js"
	// and then call "navigator.mediaDevices.getUserMedia()", but why should we?
	navigator.webkitGetUserMedia(
		{
			audio:true,
			video:false
		},
		function(stream) {
			log('getUserMedia: success (as it should be, when called from options full page)');
			navigator.mediaDevices.enumerateDevices()
				.then(update_device_options)
				.catch(errorCallback);
		},
		function(stream) {
			log('getUserMedia: error (as is expected, when run from options_ui)');
			navigator.mediaDevices.enumerateDevices()
				.then(update_device_options)
				.catch(errorCallback);
		}
	);
}

function errorCallback(error) {
	log('error: '+ error);
}

function log(message) {
	// logging to background console
	bg.console.log('options: ' +  message);
}

function update_default_no(e) {
	log("update_default_no: " +  e.target.value);
	var default_no =  bg.document.getElementById("default_no");
	default_no.value = e.target.value;
	chrome.storage.local.set({"AP_default_no" : e.target.value});
}

function update_device_options(deviceInfos) {
	log('update_device_options: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	var div = document.getElementById("device_options");
	var select = bg.document.getElementById("device_cache");
	var default_no = bg.document.getElementById("default_no");
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
			input.onchange = function(e){update_default_no(e);};
			var textNode = document.createTextNode(text);
			var label = document.createElement("label");
			if (i == default_no.value) {
				log('current default_no: ' + i + ' - ' + id + ' - ' + text);
				input.checked = true;
			}			
			label.appendChild(input);
			label.appendChild(textNode);
			div.appendChild(label);
		}
	}
}

// -- main ---------------------------------------------------------------
init();
