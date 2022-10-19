let express = require('express');
let app = express();
app.use(express.json());
var cookieParser = require('cookie-parser');
app.use(cookieParser());

const { v4: uuid } = require('uuid');

// @TODONOT do this at home
// Now we can manage all logs from one script. (Extension/server refreshes are needed.)
var fs = require('fs');
eval(fs.readFileSync('../app/debug.js')+'');
eval(fs.readFileSync('../app/keyMap.js')+'');

// Start the server
var serverAddress = "http://127.0.0.1";
var port = 3030;
app.listen(port, () => console.log('\nServer running on port ' + port + '!\n'))

const ecc = require('tiny-secp256k1');
const serverPrivateKey = Buffer.from("oMk7zvrgDgW7fZ0Vp5TjF/Toc4JWTa0GB2IbCmI0TlU=", "base64");
const serverPublicKey = ecc.pointFromScalar(serverPrivateKey);

console.log("Verifiable Consumer Request (VCR) server info:")
console.log("\tCurve: secp256k1")
console.log("\tPrivate key: " + Buffer.from(serverPrivateKey).toString("base64"));
console.log("\tPublic key: " + Buffer.from(serverPublicKey).toString("base64"));

// Crypto for randoms
let crypto = require('crypto');
const CHALLENGE_LEN_IN_BYTES = 16;

let pageLoadCount = 0;

// Track client-visited URLs
let clientVisits = {};

app.post('/vcr', (req, res) => {
	let vcrRequestReceivedDate = Date.now();
	console.log("Received a VCR request. Request body: " + JSON.stringify(req.body));
	// Look for the VCR key
	if (!(keyMap["vcr_key"] in req.body)) {
		console.log("VCR key not present.")
		res.json('{"err": "vcr_key_not_present"}');
		return;
	}
	console.log("VCR key present. Generating cookie wrapper.");
	// Extract VCR key
	let vcrKey = req.body[keyMap["vcr_key"]];

	// Create challenge for future proof of possession of key
	let challenge = crypto.randomBytes(CHALLENGE_LEN_IN_BYTES).toString('base64');
	console.log("Generated challenge.");


	// Check for client id name and client id
	if (!(keyMap["client_id_cookie"] in req.body)) {
		console.log("Client does not have client id cookie set.");
		res.json('{"err": "client_id_cookie_not_present"}');
		return;
	}

	// Get the signed cookie wrapper
	// A cookie wrapper associates a VCR key with a client id name-value pair set as cookie on the client.
	let cookie = {
		[keyMap["vcr_key"]]: vcrKey,
		[keyMap["client_id_cookie"]]: req.body[keyMap["client_id_cookie"]],
		// [keyMap["vcr_challenge"]]: challenge // Removed due to TLS. Necessary for non-TLS design.
	};
	console.log("Cookie: " + JSON.stringify(cookie));
	let cookieHash = crypto.createHash('sha256').update(JSON.stringify(cookie)).digest();
	console.log("Cookie hash in Base64: " + Buffer.from(cookieHash).toString("base64"));
	let cookieWrapper = Buffer.from(ecc.sign(cookieHash, serverPrivateKey)).toString("base64");
	console.log("Cookie wrapper in Base64: " + cookieWrapper);
	console.log("Generated cookie wrapper. Original cookie: " + JSON.stringify(cookie));

	// Create server response
	let vcrRes = {
		// [keyMap["vcr_challenge"]]: challenge, // Removed due to TLS. Necessary for non-TLS design.
		[keyMap["cookie_wrapper"]]: cookieWrapper,
		[keyMap["server_public_key"]]: Buffer.from(serverPublicKey).toString("base64")
	};
	console.log("Server returned: " + JSON.stringify(vcrRes));
	let vcrResponseReadyDate = Date.now();
	console.debug("Time from vcrRequestReceivedDate to vcrResponseReadyDate " + (vcrResponseReadyDate - vcrRequestReceivedDate) + " ms.");
	res.json(vcrRes);
});

app.post('/vcrVerify', (req, res) => {
	let vcrReceivedDate = Date.now();
	console.log("Received a VCR verification request. Request body: " + JSON.stringify(req.body));
	// Look for the VCR key
	if (!(keyMap["vcr"] in req.body) || !(keyMap["signature"] in req.body) || !(keyMap["cookie_wrapper"] in req.body)) {
		console.log("VCR or signature or cookie wrapper not present.")
		res.json({"err": "vcr_or_signature_or_cookie_wrapper_not_present"});
		return;
	}
	console.log("VCR signature and cookie wrapper present. verifying the signature");

	// Verify the overall VCR
	let vcr = req.body[keyMap["vcr"]];
	let signature = req.body[keyMap["signature"]];
	let vcrHash = crypto.createHash('sha256').update(JSON.stringify(vcr)).digest();
	let verified = ecc.verify(vcrHash, Buffer.from(vcr[keyMap["vcr_key"]], "base64"), Buffer.from(signature, "base64"));
	if (verified) {
		console.log("VCR verified using the public key: " + vcr[keyMap["vcr_key"]]);
	} else {
		console.log("VCR verification failed using the public key: " + vcr[keyMap["vcr_key"]]);
		res.json({"err": "vcr_verification_failed"});
		return;
	}

	// Verify the cookie wrapper
	let cookieWrapper = req.body[keyMap["cookie_wrapper"]];
	let cookie = {
		[keyMap["vcr_key"]]: vcr[keyMap["vcr_key"]],
		[keyMap["client_id_cookie"]]: vcr[keyMap["client_id_cookie"]],
		// [keyMap["vcr_challenge"]]: vcr[keyMap["vcr_challenge"]] // Removed due to TLS. Necessary for non-TLS design.
	};
	let cookieHash = crypto.createHash('sha256').update(JSON.stringify(cookie)).digest();
	verified = ecc.verify(cookieHash, serverPublicKey, Buffer.from(cookieWrapper, "base64"));
	if (verified) {
		console.log("Cookie wrapper verified using the server public key.");
	} else {
		console.log("Cookie wrapper verification failed.");
		res.json({"err": "cookie_wrapper_verification_failed"});
		return;
	}

	let vcrVerifiedDate = Date.now();
	console.debug("Time from vcrReceivedDate to vcrVerifiedDate: " + (vcrVerifiedDate - vcrReceivedDate) + " ms.");

	// Process the VCR
	if (req.body[keyMap["vcr"]][keyMap["action"]] == "access") {
		res.json({"client_data": clientVisits[vcr[keyMap["client_id_cookie"]]]});
		return;
	} else if (req.body[keyMap["vcr"]][keyMap["action"]] == "delete") {
		delete clientVisits[vcr[keyMap["client_id_cookie"]]];
		res.json({"deletion": "success"});
		return;
	} else {
		res.json({"err": "unsupported_action"});
		return;
	}
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}		


app.get('/*', (req, res) => {
	console.log("\nRequest headers: " + JSON.stringify(req.headers) + "\n");

	let clientIdCookie = null;
	// Set random client id as cookie if the client is unknown
	if (!("client_id" in req.cookies)) {
		console.log("Unknown client. Creating a client id.");

		let randomId = uuid();
		res.cookie("client_id", randomId);
		// Add the client id cookie as header, we don't want to send this over and over with each request
		res.set(keyMap["client_id_cookie"], "client_id=" + randomId);
		console.log("Set cookie client_id=" + randomId);
		clientIdCookie = "client_id=" + randomId;


		// Set VCR endpoint headers
		let url = serverAddress + ':' + port;
		res.set(keyMap['vcr_request_endpoint'], url + '/vcr');
		res.set(keyMap['vcr_verify_endpoint'], url + '/vcrVerify');
	} else {
		clientIdCookie = "client_id=" + req.cookies.client_id;
		console.log("Known client with id: " + clientIdCookie);
	}

	// Save client visit
	if (!([clientIdCookie] in clientVisits)) {
		// Create a spot for the client info
		clientVisits[clientIdCookie] = {};
		// For storing visits
		clientVisits[clientIdCookie].visits = [];
	}
	clientVisits[clientIdCookie].visits.push(req.url);
	console.log("Saved visit " + req.url + " for client " + clientIdCookie);
	console.log("Client visits: " + JSON.stringify(clientVisits));

	// Invalidate any cache by using a dynamic value, Chrome unfortunately caches previous headers if this is not done
	pageLoadCount++;
	res.send('<!DOCTYPE html><html><head><link rel="icon" href="data:,"></head><body><h1>Verifiable Consumer Request (VCR) Test Page, Test Number: ' + pageLoadCount + '</h1></body></html>');
});
