var visible_shadow_audio;
var hidden_audio = new Audio("./WebRTC/audio/audio.mp3");

function play_hidden_audio() {
	if (hidden_audio.paused)
	{
		hidden_audio.loop = true;
		hidden_audio.play();
	} else {
		hidden_audio.pause();
	}
}

function add_visible_audio() {
	var audio = document.getElementById("visible_audio");
	if (audio) {
		if (audio.paused)
		{
			audio.loop = true;
			audio.play();
		} else {
			audio.pause();
		}
	} else {
		document.getElementById("add_visible_audio").innerText = "Play/Pause new Visible";
		audio = document.createElement("AUDIO");
		audio.id = "visible_audio";
		audio.src = "./WebRTC/audio/audio.mp3";
		audio.controls = true;
		document.getElementById("more_audio").appendChild(audio);
	}
}

function add_visible_shadow_audio() {
	if (visible_shadow_audio) {
		if (visible_shadow_audio.paused)
		{
			visible_shadow_audio.loop = true;
			visible_shadow_audio.play();
		} else {
			visible_shadow_audio.pause();
		}
	} else {
		var s = document.getElementById("even_more_audio").attachShadow({ mode: "closed" });
		document.getElementById("add_visible_shadow_audio").innerText = "Play/Pause shadowRoot";
		visible_shadow_audio = document.createElement("AUDIO");
		visible_shadow_audio.id = "visible_audio";
		visible_shadow_audio.src = "./WebRTC/audio/audio.mp3";
		visible_shadow_audio.controls = true;
		s.appendChild(visible_shadow_audio);
	}
}
