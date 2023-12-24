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
		if (top.activeSinkId)
		{
			// Set the sinkId to our active device.
			node.setSinkId(top.activeSinkId);
		}
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

// Hook HTMLMediaElement.prototype.play so we catch any elements not added to the DOM.
function hookHTMLMediaElement_play()
{
	// Don't double-hook if we already did in this context.
	if (typeof(HTMLMediaElement.prototype.play_noHook) !== "function")
	{
		// Save the original function for callback.
		HTMLMediaElement.prototype.play_noHook = HTMLMediaElement.prototype.play;
	}
	HTMLMediaElement.prototype.play = function(...args) {
		// Only try to set the sinkId if we have an activeSinkId already.
		if (top.activeSinkId) {
			this.setSinkId(top.activeSinkId);
		}
		// Pass the play request to the original function.
		return this.play_noHook.apply(this, args);
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
async function setAllSinks(){
	var queue = [];
	// Prepare to set sinkId on all audio/video nodes not in shadowRoots.
	document.querySelectorAll("audio,video").forEach( function (node){
		queue.push(node.setSinkId(top.activeSinkId));
	});
	// Prepare to set sinkId on all audio/video nodes in shadowRoots.
	document.queryShadowSelectorAll("audio,video").forEach(function (node){
		queue.push(node.setSinkId(top.activeSinkId));
	});
	// Process all located nodes.
	await Promise.all(queue);
	return true;
}

// Load hooks first.
hookHTMLMediaElement_play();
hookElement_attachShadow();
// Then start observing the document.
observer.observe(document.documentElement, {childList: true,subtree: true});
