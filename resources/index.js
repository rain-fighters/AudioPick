'use strict';

var hidden_audio = new Audio("./WebRTC/audio/audio.mp3");

function play_hidden_audio() {
	hidden_audio.loop = true;
	hidden_audio.play();
}

function pause_hidden_audio() {
	hidden_audio.pause();
}

function add_visible_audio() {
	var div = document.getElementById("more_audio");
	var audio = document.getElementById('visible_audio');
	if (audio) {
		audio.loop = true;
		audio.play();
	} else {
		audio = document.createElement('AUDIO');
		audio.id = "visible_audio";
		audio.src = "./WebRTC/audio/audio.mp3";
		audio.controls = true;
		div.appendChild(audio);
	}
}
