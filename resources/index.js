var visible_shadow_audio;
var hidden_audio = new Audio("./WebRTC/audio/audio.mp3");
var visible_audioContext_source;
var hidden_audioContext;

function play_dom_audio() {
	var dom_audio = document.getElementById("dom_audio")
	if (dom_audio.paused)
	{
		dom_audio.loop = true;
		dom_audio.play();
	} else {
		dom_audio.pause();
	}
}

function play_hidden_audio() {
	if (hidden_audio) {
		if (hidden_audio.paused)
		{
			hidden_audio.loop = true;
			hidden_audio.play();
		} else {
			hidden_audio.pause();
		}
	}
}

function add_visible_audio() {
	let audio = document.getElementById("visible_audio");
	if (audio) {
		if (audio.paused)
		{
			audio.loop = true;
			audio.play();
		} else {
			audio.pause();
		}
	} else {
		audio = new Audio("./WebRTC/audio/audio.mp3");
		audio.id = "visible_audio";
		audio.controls = true;
		document.getElementById("div_visible_audio").appendChild(audio);
		document.getElementById("add_visible_audio").innerText = "Play/Pause new Visible";
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
		var s = document.getElementById("div_visible_shadow_audio").attachShadow({ mode: "closed" });
		visible_shadow_audio = new Audio("./WebRTC/audio/audio.mp3");
		visible_shadow_audio.id = "visible_shadow_audio";
		visible_shadow_audio.controls = true;
		s.appendChild(visible_shadow_audio);
		document.getElementById("add_visible_shadow_audio").innerText = "Play/Pause shadowRoot";
	}
}

function add_visible_audioContext_source() {
	if (visible_audioContext_source) {
		if (visible_audioContext_source.paused)
		{
			visible_audioContext_source.loop = true;
			visible_audioContext_source.play();
		} else {
			visible_audioContext_source.pause();
		}
	} else {
		visible_audioContext_source = new Audio("./WebRTC/audio/audio.mp3");
		visible_audioContext_source.id = "visible_audioContext_source";
		visible_audioContext_source.controls = true;
		document.getElementById("div_visible_audioContext_source").appendChild(visible_audioContext_source);
		document.getElementById("add_visible_audioContext_source").innerText = "Play/Pause visible AudioContext Source";
		document.getElementById("add_hidden_audioContext").disabled = false;
	}
}

function add_hidden_audioContext() {
	if (hidden_audioContext) {
		if (visible_audioContext_source.paused)
		{
			visible_audioContext_source.loop = true;
			visible_audioContext_source.play();
		} else {
			visible_audioContext_source.pause();
		}
	} else {
		hidden_audioContext = new AudioContext;
		const source = hidden_audioContext.createMediaElementSource(visible_audioContext_source);
		const gainNode = hidden_audioContext.createGain();
		source.connect(gainNode);
		gainNode.connect(hidden_audioContext.destination);
		document.getElementById("add_hidden_audioContext").innerText = "Play/Pause hidden AudioContext (Source)";
		document.getElementById("div_hidden_audioContext").innerText = "Sink is now determined by AudioContext!";
	}
}
