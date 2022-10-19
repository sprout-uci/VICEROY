// This is somewhat of a hack. This JS file needs to be loaded for it to take effect.
// See https://stackoverflow.com/a/1215400/2233864
let DEBUG = true;
if (!DEBUG) {
	console.log = function() {}
	console.debug("console.log disabled.");
}