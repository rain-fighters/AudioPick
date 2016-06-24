/*
 * $Id: content.js 41 2016-05-17 01:02:15Z  $
 */

 'use strict';
 
var sink_id = 'default';
var sink_no = 0;
var useGUM = false;

// -- Register a listener for the page_action messages from the popup page 
// -- Update the sink_id of all <audio/> and <video/> elements on message 
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request.message === "page_action_commit" ) {
			log('Received message: page_action_commit, sink_no: ' + request.sink_no);
			if (request.sink_no != undefined) {
				sink_no = request.sink_no;
				update_sink_id();
			}
		} else if (request.message == "report_sink_no") {
			log('Received message: report_sink_no');
			log('Reply with: sink_no: ' + sink_no);
			sendResponse({'sink_no': sink_no});
		}
	}
);		

// -- Register a Mutation Observer to monitor changes and additions of <audio/> and <video/> elements
// -- Update the sink_id of all <audio/> and <video/> elements when something was changed or added 
var observer = new MutationObserver(
	function(mutations) {
		var needs_update = false;
		mutations.forEach(
			function(mutation) {
				//log('mutation.type: ' + mutation.type);
				if (mutation.type == 'attributes') {
					if (check_node(mutation.target)) needs_update = true;
				} else {
					for (var i = 0; i < mutation.addedNodes.length; i++) {
						if (check_node(mutation.addedNodes[i])) needs_update = true;
					}
				}
			}
		);
		if (needs_update) update_all_sinks();
	}
);

function check_node(node) {
	var name = node.nodeName;
	var attributes = node.attributes
	if ((name == 'AUDIO') || (name == 'VIDEO') || (name == 'OBJECT') || (name == 'EMBED') || (name == 'APPLET')) {
//	if ((name == 'AUDIO') || (name == 'VIDEO')) {
		log('node added/changed: ' + name);
		return true;
	}
	return false;
}

observer.observe(document.documentElement, {
	childList: true,
	subtree: true,
	attributes: true,
	characterData: true
});

// -- Request the default sink_no from the background
// -- Calculate the corresponding sink_id (ids of content and background differ)
// -- This (update_sink_id) triggers updating the sink_id of all <audio/> and <video/> elements
function request_default_sink() {
	chrome.runtime.sendMessage({'method': 'AP_get_default_no'},
		function(response) {
			if (response) {
				log('Received default_no: ' + response.default_no);
				sink_no = response.default_no;
				update_sink_id();
			}
		}
	)
}

function update_sink_id() {
	if (useGUM) {
		navigator.webkitGetUserMedia(
			{
				audio:true,
				video:false
			},
			function(stream) {
				log('getUserMedia: success');
				navigator.mediaDevices.enumerateDevices()
					.then(inspect_devices)
					.catch(errorCallback);
			},
			function(stream) {
				log('getUserMedia: error');
				navigator.mediaDevices.enumerateDevices()
					.then(inspect_devices)
					.catch(errorCallback);
			}
		);
	} else {
		navigator.mediaDevices.enumerateDevices()
			.then(inspect_devices)
			.catch(errorCallback);
	}
}

function errorCallback(error) {
	log('Error: '+ error);
}

function log(message) {
	console.log('AudioPick: ' + message);
}

function inspect_devices(deviceInfos) {
	log('Inspect Devices: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	for (var i = 0; i !== deviceInfos.length; ++i) {
		var deviceInfo = deviceInfos[i];
		//log('Inspecting Devices[' + i + ']: ' + deviceInfo.deviceId + ' - ' + deviceInfo.label);
		if ((deviceInfos[i].kind == 'audiooutput') && (i == sink_no)) {
			log('Selecting Devices[' + i + ']: ' + deviceInfo.deviceId + ' - ' + deviceInfo.label);
			sink_id = deviceInfo.deviceId;
		}
	}
	update_all_sinks();
}

function maybe_retry_with_GUM(error)  {
	if (!useGUM) {
		useGUM = true;
		log('SetSinkId failed. Retrying with GUM enabled ...');
		update_sink_id();
	} else {
		log('SetSinkId failed even with GUM enabled. Probably not a HTTPS connection ...');
	}
}

function update_all_sinks() {
	var allMedia = document.querySelectorAll('audio,video,object,embed,applet');
	for (var j = 0; j < allMedia.length; j++) {
		var name = allMedia[j].nodeName;
		if ((name == 'AUDIO') || (name == 'VIDEO')) {
			log('Media.SetSinkId: ' + j + ': ' + name + ': ' + sink_id);
			allMedia[j].setSinkId(sink_id)
				.catch(maybe_retry_with_GUM);
		} else {
			log('Maybe other Media: ' + name);
		}
	}
}

// -- main ---------------------------------------------------------------
request_default_sink();
