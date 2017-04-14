/*
 * $Id: content.js 57 2016-05-21 19:35:55Z  $
 */

 'use strict';
 
var sink_no = 0;
var sink_id = 'default';
var frame_url = location.protocol + '//'+ location.host + location.pathname;
var frame_depth = get_depth(window.self);
var GUM_state = undefined;
/*
 * undefined == wait with getUserMedia() until we know that we actually need to call setSinkId 
 *         0 == last call to setSinkId failed. Going to call getUserMedia() next time
 *         1 == getUserMedia() succeeded 
 *        -1 == getUserMedia() failed 
 */
 
function get_depth(w) {
	if (w.parent == w) {
		return 0;
	} else {
		return 1 + get_depth(w.parent);
	}
}
function log(message) {
	console.log('  '.repeat(frame_depth) + 'AudioPick(' + frame_url + '): ' + message);
}

function errorCallback(error) {
	log('Error: '+ error);
}

// -- Register a listener for messages from the popup page
function register_message_listener() {
	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.message === "browser_action_commit" ) {
				log('Received message: browser_action_commit, sink_no: ' + request.sink_no);
				if (request.sink_no != undefined) {
					sink_no = request.sink_no;
					get_devices(); // --> inspect_device_infos() --> update_all_sinks()
				}
			} else if (request.message == "report_sink_no") {
				log('Received message: report_sink_no');
				log('Reply with: sink_no: ' + sink_no);
				sendResponse({'sink_no': sink_no});
			}
		}
	)
}	

// -- Register a Mutation Observer to monitor changes and additions of <audio/> and <video/> elements
function register_observer() {
	var observer = new MutationObserver(
		function(mutations) {
			var needs_update = false;
			mutations.forEach(
				function(mutation) {
					//log('mutation.type: ' + mutation.type);
					if (mutation.type == 'attributes') {
						// This can cause a loop!
						//if (check_node(mutation.target)) needs_update = true;
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
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		characterData: true
	});
}

function check_node(node) {
	var name = node.nodeName;
	var attributes = node.attributes
	if ((name == 'AUDIO') || (name == 'VIDEO')) {
		log('node added/changed: ' + name);
		return true;
	}
	return false;
}

// -- Request the default sink_no from the background
function request_default_no() {
	log('Requesting default_no ...');
	chrome.runtime.sendMessage({'method': 'AP_get_default_no'},
		function(response) {
			if (response) {
				log('Received default_no: ' + response.default_no);
				sink_no = response.default_no;
				get_devices();
			}
		}
	)
}

function request_help_with_GUM() {
	chrome.runtime.sendMessage({'method': 'AP_help_with_GUM', 'primaryPattern': location.protocol + '//'+ location.host + '/*'},
		function(response) {
			if (response) {
				log('Received result: ' + response.result);
				GUM_state = 1;
				update_all_sinks();
			}
		}
	);
}

function get_devices() {
	navigator.mediaDevices.enumerateDevices()
		.then(inspect_devices)
		.catch(errorCallback);
}

function inspect_devices(deviceInfos) {
	log('Inspecting Devices: ' + deviceInfos.length + ' device(s) total (audio/video input/output)');
	for (var i = 0; i != deviceInfos.length; i++) {
		var deviceInfo = deviceInfos[i];
		//log('  Devices[' + i + ']: ' + deviceInfo.kind + ': ' + deviceInfo.deviceId);
		if ((deviceInfo.kind == 'audiooutput') && (i == sink_no)) {
			log('Selecting Devices[' + i + ']: ' + deviceInfo.deviceId);
			sink_id = deviceInfo.deviceId;
		}
	}
	with_or_without_GUM();
}

function with_or_without_GUM() {
	if (GUM_state == 0) {
		request_help_with_GUM();
	} else {
		update_all_sinks();		
	}	
}

function update_all_sinks() {
	var promises = [];
	var allMedia = document.querySelectorAll('audio,video');
	for (var j = 0; j < allMedia.length; j++) {
		var name = allMedia[j].nodeName;
		var src = allMedia[j].currentSrc;
		log('  Queuing SetSinkId: ' + j + ': ' + name + ': ' +  src + ': ' + sink_id);
		promises.push(allMedia[j].setSinkId(sink_id));
	}
	if (promises.length > 0) {
		log('Tyring to update all (' + promises.length + ') sinks (GUM_state == ' + GUM_state + '): ' + sink_id);
		Promise.all(promises)
			.then(function(results){log('All set.'); })
			.catch(function(error){
				if (GUM_state == undefined) {
					GUM_state = 0;
					log('SetSinkId failed: ' + error + '. Retrying with GUM ...');
					with_or_without_GUM();
				} else {
					log('SetSinkId failed: ' + error + '.  Giving up.');
				}
			});
	} else {
		log('No sinks found');
	}
	register_observer();
}

// -- main ---------------------------------------------------------------
register_message_listener();
request_default_no();


