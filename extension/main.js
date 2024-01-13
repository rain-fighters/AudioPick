// Main script handles:
// 1) Hooking AudioContext, Element, and HTMLMediaElement prototypes.
// 2) Monitoring the creation of new elements with a MutationObserver.
// 3) Injecting a listener and applying the SinkId to VIDEO and AUDIO elements.
// Main script runs in WORLD:MAIN.
//
// Unique prefix for our global variable and function names: APV3_UN1QU3_
// More possible name collisions we currently do not address, e. g.
//   - window.activeSink                  (property name)
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
	if (window.localStorage["APV3_UN1QU3_enableDebug"]) {
		console.log('APV3-main.js', ...args);
	}
}

// A pure JavaScript Promise-based Mutex implementation
// Copied from https://github.com/mgtitimoli/await-mutex
// Unlicensed. See https://unlicense.org/
//
// Might use this in a like this ...
//	var APV3_UN1QU3_setSinkMutex = new APV3_UN1QU3_Mutex();
//	async function withCriticalSection() {
//		...
//		let unlock = await APV3_UN1QU3_setSinkMutex.lock();
//
//		critical section
//
//		unlock();
//	}

class APV3_UN1QU3_Mutex {
	constructor() {
		this._locking = Promise.resolve();
		this._locks = 0;
	}

	isLocked() {
		return this._locks > 0;
	}

	lock() {
		this._locks += 1;
		let unlockNext;
		let willLock = new Promise(resolve => unlockNext = () => {
			this._locks -= 1;
			resolve();
		});
		let willUnlock = this._locking.then(() => unlockNext);
		this._locking = this._locking.then(() => willLock);
		return willUnlock;
	}
}

async function APV3_UN1QU3_maybeSetSinkId(targetElement, trigger, sinkId) {
	if (sinkId === "default") {
		sinkId = "";
	}
	if (sinkId === targetElement.sinkId) {
		return true;
	}
	if ((targetElement instanceof HTMLMediaElement) && (targetElement.sourceOfAudioContext)) {
		// Skip setsinkId() on HTMLMediaElement(s)s that were used to
		// create MediaElementAudioSourceNode(s) of an AudioContext.
		APV3_UN1QU3_debugMessage("| " + trigger + "(skip):", targetElement.constructor.name, "| targetElement:", targetElement,
				"| sourceOfAudioContext:", targetElement.sourceOfAudioContext, "| foundViaMethod:", targetElement.foundViaMethod);
		return false;
	}
	try {
		APV3_UN1QU3_debugMessage("| " + trigger + "(try):", targetElement.constructor.name, "| targetElement:", targetElement,
			"| sourceOfAudioContext:", targetElement.sourceOfAudioContext, "| foundViaMethod:", targetElement.foundViaMethod,
			"| oldSinkId:", targetElement.sinkId, "| sinkId:", sinkId);
		await targetElement.setSinkId(sinkId);
		return true;
	} catch(error) {
		APV3_UN1QU3_debugMessage("| " + trigger + "(catch):", targetElement.constructor.name, "| targetElement:", targetElement,
			"| sourceOfAudioContext:", targetElement.sourceOfAudioContext, "| foundViaMethod:", targetElement.foundViaMethod,
			"| error:", error);
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
		if ((typeof window.activeSinkId !== "undefined") && method.startsWith("addEventListener_")) {
			await APV3_UN1QU3_maybeSetSinkId(targetElement, "setSinkId", window.activeSinkId);
		}
	}
	// Only try to set the sinkId, if we have an activeSinkId already.
	// ... and only once when (only) found via addEventListener_*_hook
	if ((typeof window.activeSinkId !== "undefined") && !method.startsWith("addEventListener_")) {
		await APV3_UN1QU3_maybeSetSinkId(targetElement, "setSinkId", window.activeSinkId);
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
	ME.play = function(...args) {
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

// Hook all AudioContext.prototype create functions to catch any AudioContexts.
function APV3_UN1QU3_hookAudioContext_create() {
	// Alias AudioContext.prototype to allow for shorter line length.
	const AC = AudioContext.prototype;
	// Don't double-hook if we already did in this context.
	if (typeof(AC.createMediaElementSource_noHook) !== "function") {
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
		APV3_UN1QU3_addListenerAndSetSinkId(this, "createMediaElementSource_hook");
		// Mark the HTMLMediaElement (args[0]) used to create the MediaElementAudioSourceNode
		// as being used by an AudioContext to prevent calling setSinkId() on it.
		args[0].sourceOfAudioContext = true;
		return this.createMediaElementSource_noHook.apply(this, args);
	};
	AC.createMediaStreamSource = function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "createMediaStreamSource_hook");
		return this.createMediaStreamSource_noHook.apply(this, args);
	};
	AC.createMediaStreamDestination = function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "createMediaStreamDestination_hook");
		return this.createMediaStreamDestination_noHook.apply(this, args);
	};
	AC.createMediaStreamTrackSource = function(...args) {
		APV3_UN1QU3_addListenerAndSetSinkId(this, "createMediaStreamTrackSource_hook");
		return this.createMediaStreamTrackSource_noHook.apply(this, args);
	};
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
		APV3_UN1QU3_observer.observe(s, {childList: true,subtree: true});
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
// This will be called by our injected function.
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
