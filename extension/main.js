// Main script handles:
// 1) Hooking AudioContext, Element, and HTMLMediaElement prototypes.
// 2) Monitoring the creation of new elements with a MutationObserver.
// 3) Injecting a listener and applying the SinkId to VIDEO and AUDIO elements.
// Main script runs in WORLD:MAIN.
//
// Observer function that will be called for any new nodes or shadowRoots.
const observer = new MutationObserver(function (mutations) {
	// Check each mutation to see if nodes have been added.
	mutations.forEach(function (mutation) {
		// If nodes have been added then recursively update sinkId on all.
		mutation.addedNodes.forEach(function (node) {
			recursiveSetSinkId(node);
		});
	});
});

// The function we call to initially add the eventListener and set the sinkId.
// Can be called on any HTMLMediaElement or descendants.
async function addListenerAndSetSinkId(targetElement) {
	if (typeof(targetElement.sinkListener) !== "function") {
		targetElement.sinkListener = function (e) {
			if (e.detail === "default") {
				// If the sinkId is for the default device submit a blank string.
				// AudioContext elements don't support "default" as a value.
				// Non-AudioContext elements support both "default" and "".
				targetElement.setSinkId("");
			}
			else
			{
				// Otherwise set the sinkId to the value provided by the event.
				targetElement.setSinkId(e.detail);
			}
		}
		// Add event listener to top for ease of event management.
		window.addEventListener("changeSinkId", targetElement.sinkListener, true);
	}
	// Only try to set the sinkId if we have an activeSinkId already.
	if (typeof window.activeSinkId !== "undefined") {
		if (window.activeSinkId === "default") {
			// If the sinkId is for the default device submit a blank string.
			// AudioContext elements don't support "default" as a value.
			// Non-AudioContext elements support both "default" and "".
			targetElement.setSinkId("");
		} else {
			// Otherwise set the sinkId to the value stored in global var.
			targetElement.setSinkId(window.activeSinkId);
		}
	}
}

// Function to recursively set the sinkId on any audio/video elements.
// It will recursively apply to all children and shadowRoots.
async function recursiveSetSinkId(node)
{
	var queue = [];
	// If there are children queue each one up to pass back to this function.
	if (node.hasChildNodes())
	{
		node.childNodes.forEach(function (child) {
			queue.push(recursiveSetSinkId(child));
		});
	}
	// If there are shadowRoots make sure they're being observed.
	// Then queue each child to send back to this function.
	if (node.shadowRoot)
	{
		observer.observe(node.shadowRoot, {childList: true,subtree: true});
		node.shadowRoot.childNodes.forEach(function (child) {
			queue.push(recursiveSetSinkId(child));
		});
	}
	// If the current node is an audio/video node then set the sinkId.
	if ((node.nodeName === "AUDIO") || (node.nodeName === "VIDEO")){
		await addListenerAndSetSinkId(node);
	}
	// Process all children.
	await Promise.all(queue);
	return true;
}

// Hook Element.prototype.attachShadow so we see any shadowRoots created.
function hookElement_attachShadow()
{
	// Don't double-hook if we already did in this context.
	if (typeof(Element.prototype.attachShadow_noHook) !== "function")
	{
		// Save the original function for callback.
		Element.prototype.attachShadow_noHook = Element.prototype.attachShadow;
	}
	// Set our hook.
	Element.prototype.attachShadow = function(options) {
			// Create the shadowRoot with the original function.
			var s = this.attachShadow_noHook.apply(this, arguments);
			// Attach our observer to watch for any changes.
			observer.observe(s, {childList: true,subtree: true});
			// Recursively set sinkIDs on any existing children.
			recursiveSetSinkId(s);
			// Return the requested shadowRoot.
			return s;
	};
}

// Hook HTMLMediaElement.prototype.play to catch any elements that
// already exist outside of the DOM.
function hookHTMLMediaElement_play()
{
	// Don't double-hook if we already did in this context.
	if (typeof(HTMLMediaElement.prototype.play_noHook) !== "function")
	{
		// Save the original function for callback.
		HTMLMediaElement.prototype.play_noHook = HTMLMediaElement.prototype.play;
	}
	// Set our hook
	HTMLMediaElement.prototype.play = function(...args) {
		addListenerAndSetSinkId(this);
		// Pass the play request to the original function.
		return this.play_noHook.apply(this, args);
	};
}

// Hook all AudioContext.prototype create functions to catch any AudioContexts.
function hookAudioContext_create()
{
	// Alias AudioContext.prototype to allow for shorter line length.
	const AC = AudioContext.prototype;
	// Don't double-hook if we already did in this context.
	if (typeof(AC.createMediaElementSource_noHook) !== "function")
	{
		// Save the original functions for callback.
		AC.createMediaElementSource_noHook = AC.createMediaElementSource;
		AC.createMediaStreamSource_noHook = AC.createMediaStreamSource;
		AC.createMediaStreamDestination_noHook = AC.createMediaStreamDestination;
		AC.createMediaStreamTrackSource_noHook = AC.createMediaStreamTrackSource;
	}
	// Set our hooks
	// Each hooked function simply calls addListenerAndSetSinkId on the object
	// before calling and returning the value from the original function.
	AC.createMediaElementSource = function(...args) {
		addListenerAndSetSinkId(this);
		return this.createMediaElementSource_noHook.apply(this, args);
	};
	AC.createMediaStreamSource = function(...args) {
		addListenerAndSetSinkId(this);
		return this.createMediaStreamSource_noHook.apply(this, args);
	};
	AC.createMediaStreamDestination = function(...args) {
		addListenerAndSetSinkId(this);
		return this.createMediaStreamDestination_noHook.apply(this, args);
	};
	AC.createMediaStreamTrackSource = function(...args) {
		addListenerAndSetSinkId(this);
		return this.createMediaStreamTrackSource_noHook.apply(this, args);
	};
}


// Essentially document.querySelectorAll for shadowRoots.
// Allows us to find any shadowRoots or children that were previously created.
document.queryShadowSelectorAll = function(selectors, e = document) {
	// Recursive function to locate all shadowRoots for the provided element.
	var getShadowRoots = function (el) {
		var shadowRoots = [el, ...el.querySelectorAll("*")];
		return shadowRoots.filter((ce) => Boolean(ce.shadowRoot))
			.flatMap((ce) => [ce.shadowRoot, ...getShadowRoots(ce.shadowRoot)]);
	};
	var shadowMap = getShadowRoots(e);
	var results = [];
	// Get every element from every shadowRoot.
	shadowMap.forEach(function (shadow) {
		var s = shadow.querySelectorAll(":host *");
		if (s) {s.forEach(
			function (el) {
				results.push(el);
			}
		);}
	});
	// Filter results to our selectors.
	return results.filter(
		function (r) {
			return r.matches(selectors);
		}
	);
};

// Set the sinkId on every existing audio/video element.
// This will be called by our injected function.
async function processAllMediaElements(){
	var queue = [];
	// Prepare to set sinkId on all audio/video nodes not in shadowRoots.
	document.querySelectorAll("audio,video").forEach( function (node){
		queue.push(addListenerAndSetSinkId(node));
	});
	// Prepare to set sinkId on all audio/video nodes in shadowRoots.
	document.queryShadowSelectorAll("audio,video").forEach(function (node){
		queue.push(addListenerAndSetSinkId(node));
	});
	// Process all located nodes.
	ret = await Promise.all(queue);
	return ret;
}

// Load hooks first.
hookAudioContext_create();
hookHTMLMediaElement_play();
hookElement_attachShadow();
// Then start observing the document.
observer.observe(document.documentElement, {childList: true,subtree: true});
// Then process any existing media elements to set sinkId and add listener.
processAllMediaElements();
