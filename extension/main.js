// Main script handles:
// 1) Hooking AudioContext, Element, and HTMLMediaElement prototypes.
// 2) Monitoring the creation of new elements with a MutationObserver.
// 3) Injecting a listener and applying the SinkId to VIDEO and AUDIO elements.
// Main script runs in WORLD:MAIN.
//
// Unique prefix for our global variable and function names: APV3_UN1QU3_
// More possible name collisions we currently do not address, e. g.
//   - Element.sinkListener               (property name)
//   - document.queryShadowSelectorAll    (property name)
//   - changeSinkId                       (message/event name)

// Observer function that will be called for any new nodes or shadowRoots.
const APV3_UN1QU3_observer = new MutationObserver(function (mutations) {
	// Check each mutation to see if nodes have been added.
	mutations.forEach(function (mutation) {
		// If nodes have been added then recursively update sinkId on all.
		mutation.addedNodes.forEach(function (node) {
			APV3_UN1QU3_recursiveSetSinkId(node);
		});
	});
});

// Write to console.log, if debugging is enabled.
function APV3_UN1QU3_debugMessage(...args) {
	if (window.APV3_UN1QU3_enableDebug) {
		console.log('APV3-main.js (' +
			((window === top) ? 'top-origin: ' : 'sub-origin: ') +
			window.location.origin + ')', ...args);
	}
}

async function APV3_UN1QU3_maybeSetSinkId(targetElement, trigger, sinkId) {
	try {
		// Get delegate for sink ID management
		let sinkIdReceiver;
		if (targetElement instanceof AudioContext) {
			// Web Audio API: Direct AudioContext events (e.g., "resume")
			sinkIdReceiver = targetElement;
		} else if (targetElement instanceof AudioNode) {
			// Web Audio API: Handle AudioNode updates by assigning the AudioContext sink directly
			sinkIdReceiver = targetElement.context;
		} else {
			// Other receivers (HTML media elements)
			sinkIdReceiver = targetElement;
		}
		// Get intended new sink ID
		if (sinkId === "default") {
			sinkId = "";
		}
		if (sinkId === sinkIdReceiver.sinkId) {
			return true;
		}
		// Set new sink ID
		APV3_UN1QU3_debugMessage("| " + trigger + "(try):", targetElement.constructor.name, "| targetElement:", targetElement,
			"| foundViaMethod:", targetElement.foundViaMethod,
			"| oldSinkId:", sinkIdReceiver.sinkId, "| sinkId:", sinkId);
		await sinkIdReceiver.setSinkId(sinkId);
		return true;
	} catch(error) {
		APV3_UN1QU3_debugMessage("| " + trigger + "(catch):", targetElement.constructor.name, "| targetElement:", targetElement,
			"| foundViaMethod:", targetElement.foundViaMethod,
			"| oldSinkId:", targetElement.sinkId, "| sinkId:", sinkId, "| error:", error);
		return false;
	}
}

// The function we call to initially add the eventListener and set the sinkId.
// Can be called on any HTMLMediaElement or descendants.
async function APV3_UN1QU3_addListenerAndSetSinkId(targetElement, method) {
	targetElement.foundViaMethod = method;
	if (typeof(targetElement.sinkListener) !== "function") {
		targetElement.sinkListener = function (e) {
			APV3_UN1QU3_maybeSetSinkId(targetElement, "changeSinkId", e.detail);
		}
		// Add event listener to top for ease of event management.
		window.addEventListener("changeSinkId", targetElement.sinkListener, true);
		// Only try to set the sinkId, if we have an activeSinkId already.
		// ... and only once when (only) found via addEventListener_*_hook
		if ((typeof window.APV3_UN1QU3_activeSinkId !== "undefined") && method.startsWith("addEventListener_")) {
			await APV3_UN1QU3_maybeSetSinkId(targetElement, "setSinkId", window.APV3_UN1QU3_activeSinkId);
		}
	}
	// Only try to set the sinkId, if we have an activeSinkId already.
	// ... and only once when (only) found via addEventListener_*_hook
	if ((typeof window.APV3_UN1QU3_activeSinkId !== "undefined") && !method.startsWith("addEventListener_")) {
		await APV3_UN1QU3_maybeSetSinkId(targetElement, "setSinkId", window.APV3_UN1QU3_activeSinkId);
	}
}

// Function to recursively set the sinkId on any audio/video elements.
// It will recursively apply to all children and shadowRoots.
async function APV3_UN1QU3_recursiveSetSinkId(node) {
	var queue = [];
	// If there are children queue each one up to pass back to this function.
	if (node.hasChildNodes()) {
		node.childNodes.forEach(function (child) {
			queue.push(APV3_UN1QU3_recursiveSetSinkId(child));
		});
	}
	// If there are shadowRoots make sure they're being observed.
	// Then queue each child to send back to this function.
	if (node.shadowRoot) {
		APV3_UN1QU3_observer.observe(node.shadowRoot, {childList: true,subtree: true});
		node.shadowRoot.childNodes.forEach(function (child) {
			queue.push(APV3_UN1QU3_recursiveSetSinkId(child));
		});
	}
	// If the current node is an audio/video node then set the sinkId.
	if ((node.nodeName === "AUDIO") || (node.nodeName === "VIDEO")) {
		await APV3_UN1QU3_addListenerAndSetSinkId(node, "observer_recursiveSetSinkId");
	}
	// Process all children.
	await Promise.all(queue);
	return true;
}

// Hook some HTMLMediaElement.prototype methods to catch
// elements that are created outside of the DOM tree.
function APV3_UN1QU3_hookHTMLMediaElement_various() {
	// Alias HTMLMediaElement.prototype to allow for shorter line length.
	const ME = HTMLMediaElement.prototype;
	// Don't double-hook if we already did in this context.
	if (typeof(ME.play_noHook) !== "function") {
		// Save the original functions for callback.
		ME.play_noHook = ME.play;
		ME.load_noHook = ME.load;
		ME.addEventListener_noHook = ME.addEventListener;
	}
	// Set our hooks
	// Each hooked function simply calls addListenerAndSetSinkId on the object
	// before calling and returning the value from the original function.
	// Make hooks async when the hooked function returns a promise
	// and we don't want to handle/catch possible errors, e. g. play() being
	// denied due to autoplay restrictions.
	ME.play = async function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "play_hook");
		return this.play_noHook.apply(this, args);
	};
	ME.load = function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "load_hook");
		return this.load_noHook.apply(this, args);
	};
	ME.addEventListener = function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "addEventListener_" + args[0] + "_hook");
		return this.addEventListener_noHook.apply(this, args);
	};
}

// Hook all Web Audio API (AudioContext) related prototype functions to manage AudioContext sinks.
function APV3_UN1QU3_hookAudioContext_create() {
	// Handle direct AudioContext interactions (cover additional cases, such as on-resume if
	// extension is not loaded until after AudioContext is created)
	const AC = AudioContext.prototype;
	// Don't double-hook if we already did in this context.
	if (typeof(AC.resume_noHook) !== "function") {
		// Save the original functions for callback.
		AC.resume_noHook = AC.resume;
	}
	// Set our hooks
	// Each hooked function simply calls addListenerAndSetSinkId on the object
	// before calling and returning the value from the original function.
	AC.resume = function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "resume_hook");
		return this.resume_noHook.apply(this, args);
	}

	// Handle AudioContext via its various AudioNode-based types, such as AudioBufferSourceNode,
	// ConstantSourceNode, MediaElementSourceNode, etc. These follow the MDN-recommended IoC pattern
	// for the Web Audio API, creating notes via AudioNode subtype constructors rather than
	// AudioContext factory methods. For reference, see MDN:
	// https://developer.mozilla.org/en-US/docs/Web/API/AudioNode#creating_an_audionode
	const AN = AudioNode.prototype;
	// Don't double-hook if we already did in this context.
	if (typeof(AN.connect_noHook) !== "function") {
		// Save the original functions for callback.
		AN.connect_noHook = AN.connect;
	}
	// Set our hooks
	// Each hooked function simply calls addListenerAndSetSinkId on the object
	// before calling and returning the value from the original function.
	AN.connect = function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "connect_hook");
		return this.connect_noHook.apply(this, args);
	}
}

// Hook Element.prototype.attachShadow so we see any shadowRoots created.
function APV3_UN1QU3_hookElement_attachShadow() {
	// Don't double-hook if we already did in this context.
	if (typeof(Element.prototype.attachShadow_noHook) !== "function") {
		// Save the original function for callback.
		Element.prototype.attachShadow_noHook = Element.prototype.attachShadow;
	}
	// Set our hook.
	Element.prototype.attachShadow = function(options) {
		// Create the shadowRoot with the original function.
		var s = this.attachShadow_noHook.apply(this, arguments);
		// Attach our observer to watch for any changes.
		APV3_UN1QU3_observer.observe(s, {childList: true, subtree: true});
		// Recursively set sinkIDs on any existing children.
		APV3_UN1QU3_recursiveSetSinkId(s);
		// Return the requested shadowRoot.
		return s;
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
async function APV3_UN1QU3_processAllMediaElements() {
	var queue = [];
	// Prepare to set sinkId on all audio/video nodes not in shadowRoots.
	document.querySelectorAll("audio,video").forEach(function(node) {
		queue.push(APV3_UN1QU3_addListenerAndSetSinkId(node, "processAllMediaElements_normal"));
	});
	// Prepare to set sinkId on all audio/video nodes in shadowRoots.
	document.queryShadowSelectorAll("audio,video").forEach(function (node) {
		queue.push(APV3_UN1QU3_addListenerAndSetSinkId(node, "processAllMediaElements_shadow"));
	});
	// Process all located nodes.
	ret = await Promise.all(queue);
	return ret;
}

// Load hooks first.
APV3_UN1QU3_hookHTMLMediaElement_various();
APV3_UN1QU3_hookAudioContext_create();
APV3_UN1QU3_hookElement_attachShadow();
// Then start observing the document.
APV3_UN1QU3_observer.observe(document.documentElement, {childList: true,subtree: true});
// Then process any existing media elements to set sinkId and add listener.
APV3_UN1QU3_processAllMediaElements();
