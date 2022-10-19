var hostName = "com.google.chrome.example.echo";
port = chrome.runtime.connectNative(hostName);

if (!port) {
    alert("Can't connect to native application.");
}

function onNativeMessage(message) {
    console.log("Message received from host, sending it to popup: " + JSON.stringify(message));

    chrome.runtime.sendMessage(message);
}

function onDisconnected() {
    port = null;
    alert("Host disconnected.");
}

port.onMessage.addListener(onNativeMessage);
port.onDisconnect.addListener(onDisconnected);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Message received from popup script in background script: " + JSON.stringify(request));
    port.postMessage(request);
});

// // Clear storage
chrome.storage.local.clear(
    function() {
        alert("Storage cleared.");
    }
);

var vcrData = null;
var clientIdCookieIndexMap = null;
// Initialize request counter which is incremented once per request and used to derive BIP32 keys used as VCR keys
var requestCounter = 0;

chrome.storage.local.get({"vcr_data": [], "client_id_cookie_index_map": {}, "request_counter": 0}, function(result) {
    vcrData = result.vcr_data;
    clientIdCookieIndexMap = result.client_id_cookie_index_map;
    requestCounter = result.request_counter;
    console.log("Loaded VCR data: " + JSON.stringify(vcrData));
    console.log("Loaded Client ID cookie index map: " + JSON.stringify(clientIdCookieIndexMap));
    console.log("Loaded request counter: " + requestCounter);
});

chrome.storage.local.getBytesInUse(["vcr_data"], function(bytes_in_use) {
    console.log("[VCR Data] Bytes in use: " + bytes_in_use.toString());
});

chrome.storage.local.get({"client_id_cookie_index_map": {}}, function(result) {
});

chrome.storage.local.getBytesInUse(["client_id_cookie_index_map"], function(bytes_in_use) {
    console.log("[Client ID cookie index] Bytes in use: " + bytes_in_use.toString());
});

// Initialize VCR public key (Master private key should be stored at a secure place)
// Child key is the device key here
// See https://github.com/bitcoinjs/bip32/issues/43 for key derivation path info
var node = bip32js.bip32.fromBase58('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi')
// Neutered because we don't want the child to derive further private keys
const CHILD_DERIVATION_PATH = 'm/0';
var child = node.derivePath(CHILD_DERIVATION_PATH).neutered();
var requestVCRKeys = {};

function getValueForHeader(headers, headerName) {
    for (let i = 0; i < headers.length; i++) {
        let header = headers[i];
        if (header.name === headerName) {
            return header.value;
        }
    }
    return null;
}

function getCookieValueFromSetCookieHeader(headers, cookieName) {
    for (let i = 0; i < headers.length; i++) {
        let header = headers[i];
        // Format: {"name":"Set-Cookie","value":"client_id=92; Path=/"}
        if (header.name === "Set-Cookie" && header.value.startsWith(cookieName + "=")) {
            let equalIndex = header.value.indexOf("=");
            let semicolonIndex = header.value.indexOf(";");
            // In case there is no ";" (as is the first case on https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
            if (semicolonIndex == -1) {
                semicolonIndex = header.value.length;
            }
            let cookieValue = header.value.substring(equalIndex + 1, semicolonIndex);
            return cookieValue;
        }
    }
    return null;
}

function getKeyDataIndexForClientIdCookieInCookieHeader(headers) {
    for (let i = 0; i < headers.length; i++) {
        let header = headers[i];
        if (header.name == "Cookie") {
            // Format: name=value; name2=value2; name3=value3
            let cookies = header.value.split("; ");
            for (let j = 0; j < cookies.length; j++) {
                if (cookies[j] in clientIdCookieIndexMap) {
                    let keyDataIndex = clientIdCookieIndexMap[cookies[j]];
                    console.log(cookies[j] + " is in " + JSON.stringify(clientIdCookieIndexMap) + " at index " + keyDataIndex);
                    return keyDataIndex;
                }
            }
            return -1;
        }
    }
    return -1;
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
      let requestHeadersDate = Date.now();
      console.log("Request headers: " + JSON.stringify(details.requestHeaders));
      // Find the corresponding key data for the client id cookie present in the headers
      let keyDataIndex = getKeyDataIndexForClientIdCookieInCookieHeader(details.requestHeaders);
      if (keyDataIndex == -1) {
        console.log("No client id cookie for any key found.");
        return {requestHeaders: details.requestHeaders};
      }
      let historySessionMatchingEndDate = Date.now();
      console.debug("History-session matching took: " + (historySessionMatchingEndDate - requestHeadersDate) + " ms.");
      // Update the history if the URL is not pointing to VCR request or verify end point
      if ( !( details.url == vcrData[keyDataIndex][keyMap["vcr_request_endpoint"]] ||
              details.url == vcrData[keyDataIndex][keyMap["vcr_verify_endpoint"]] ) ) {
        // Extract URL path (e.g., /products/laptop/)
        let path = new URL(details.url).pathname;
        // Update the history
        vcrData[keyDataIndex][keyMap["history"]].push({
            [keyMap['date']]: new Date().getTime(),
            [keyMap['path']]: path
        });
        console.log("History for key updated to: " + JSON.stringify(vcrData[keyDataIndex][keyMap["history"]]));
        chrome.storage.local.set({
            "vcr_data": vcrData
        }, function() {
          let historyUpdateStoreEndDate = Date.now();
          console.debug("History update and save took: " + (historyUpdateStoreEndDate - historySessionMatchingEndDate) + " ms.");
          console.log("VCR data saved after the history update!");
        });
        return {requestHeaders: details.requestHeaders};
      }
    },
    {urls: ["http://127.0.0.1/*"]},
    ["blocking", "requestHeaders", "extraHeaders"]
);

// Extract server VCR response from response headers
chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
        let headersReceivedDate = Date.now();
        console.log("Response headers: " + JSON.stringify(details.responseHeaders));

        // Get VCR endpoints
        let vcrRequestEndpoint = getValueForHeader(details.responseHeaders, keyMap["vcr_request_endpoint"]);
        let vcrVerifyEndpoint = getValueForHeader(details.responseHeaders, keyMap["vcr_verify_endpoint"]);

        if (vcrRequestEndpoint == null || vcrVerifyEndpoint == null) {
            console.log("VCR endpoints not provided, no VCR key generated.");
            return {responseHeaders: details.responseHeaders};
        }

        // Get client id cookie from headers
        let clientIdCookie = getValueForHeader(details.responseHeaders, keyMap["client_id_cookie"]);

        if (clientIdCookie == null) {
            console.log("Client id cookie should be present, but not provided.");
            return {responseHeaders: details.responseHeaders};
        }
        console.log("Client id cookie is " + clientIdCookie);

        console.debug("Header parsing took: " + (Date.now() - headersReceivedDate) + " ms.")
        // Generate VCR key form the child key using request counter as index
        let keyDerivationStartDate = Date.now();
        // TODO: Generate requestPublicKey from devicePublicKey taken from Solokey
        // ISSUE: native messaging is async, so we can't wait until we receive a response from the host app.
        // IDEA: Get devicePublicKey from Solokey at init, then calculate requestPublicKey on device
        // chrome.runtime.sendNativeMessage(hostName, message,
        // function(response) {
        //     if (chrome.runtime.lastError) {
        //         console.log("ERROR: " + chrome.runtime.lastError.message);
        //     } else {
        //         // requestPublicKey = response.data;
        //         console.log("Received " + response.data);
        //     }
        // });
        let requestPublicKey = null;
        var dev_node = bip32js.bip32.fromBase58('xpub698BAbjB6vfxkBgVqkardSgbmcxvkVb7sesPxgt2T7XGpQAjjdu4Jg6g7iCYVmuzieBnk99uLYaypkdytSgakmkePhQq82H3eS7Z2ze1rdj')
        requestPublicKey = dev_node.derive(requestCounter).publicKey.toString('base64');
		let message = {
			"purpose": "devkey",
			"data": {"request_counter": requestCounter}
		};
        console.log("Message to native app: " + JSON.stringify(message));
        let keyDerivationEndDate = Date.now();
        console.debug("Key derivation took: " + (keyDerivationEndDate - keyDerivationStartDate) + " ms.");
        let derivationPath = CHILD_DERIVATION_PATH + "/" + requestCounter;
        console.log("Derivation path and VCR key: " + derivationPath + " " + requestPublicKey);

        // Prepare for next request
        requestCounter++;

        // Send VCR request to server's request endpoint
        let vcrRequest = {
            [keyMap["vcr_key"]]: requestPublicKey,
            [keyMap["client_id_cookie"]]: clientIdCookie
        };
        let wrapperRequestSentDate = Date.now();
        console.debug("Wrapper request preparation took: " + (wrapperRequestSentDate - keyDerivationEndDate) + " ms.");
        fetch(vcrRequestEndpoint, {
          method: 'POST',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(vcrRequest)
        }).then(
            res => res.json()
        ).then(function(data) {
            let serverReturnedWrapperDate = Date.now();
            console.log("Received response from VCR request endpoint: " + JSON.stringify(data));
            console.log("VCR data present: " + JSON.stringify(vcrData));

            // Verify cookie wrapper
            let cookie = {
                [keyMap["vcr_key"]]: requestPublicKey,
                [keyMap["client_id_cookie"]]: clientIdCookie,
                // [keyMap["vcr_challenge"]]: data[keyMap["vcr_challenge"]] // Removed due to TLS. Necessary for non-TLS design.
            };
            let cookieHash = bip32js.crypto.createHash('sha256').update(JSON.stringify(cookie)).digest();
            console.log("Cookie hash in Base64: " + bip32js.buffer.Buffer.from(cookieHash).toString("base64"));
            let serverPublicKey = bip32js.buffer.Buffer.from(data[keyMap["server_public_key"]], "base64");
            console.log("Server public key in Base64: " + bip32js.buffer.Buffer.from(serverPublicKey).toString("base64"));
            let verified = bip32js.ecc.verify(cookieHash, serverPublicKey, bip32js.buffer.Buffer.from(data[keyMap["cookie_wrapper"]], "base64"));
            if (verified) {
                console.log("Cookie wrapper verified!");
            } else {
                alert("FAILED: Cookie wrapper verification!");
                return;
            }

            console.debug("Wrapper verification took: " + (Date.now() - serverReturnedWrapperDate) + " ms.");

            let newKeyDataStartDate = Date.now();
            // Divide URL into origin (e.g., http://127.0.0.1) and path (e.g., /products/laptop/)
            let origin = new URL(details.url).origin;
            let path = new URL(details.url).pathname;
            // Create new key data with empty history
            let newKeyData = {
                [keyMap["vcr_key"]]: requestPublicKey,
                [keyMap["server_public_key"]]: data[keyMap["server_public_key"]],
                [keyMap["derivation_path"]]: derivationPath,
                [keyMap["client_id_cookie"]]: clientIdCookie,
                // [keyMap["vcr_challenge"]]: data[keyMap["vcr_challenge"]], // Removed due to TLS. Necessary for non-TLS design.
                [keyMap["cookie_wrapper"]]: data[keyMap["cookie_wrapper"]],
                [keyMap["url_origin"]]: origin,
                [keyMap["history"]]: [],
                [keyMap["vcr_request_endpoint"]]: vcrRequestEndpoint,
                [keyMap["vcr_verify_endpoint"]]: vcrVerifyEndpoint
            }
            // Add the current request to the history. Note that from now on for this key the history will be updated by the request header handler
            newKeyData[keyMap["history"]] = [
                {
                    [keyMap["date"]]: new Date().getTime(),
                    [keyMap["path"]]: path
                }
            ];
            console.log("New key data: " + JSON.stringify(newKeyData));

            // Store new key data
            vcrData.push(newKeyData);
            // Store the index of the cookie
            // This is to allow fast cookie sweep where the cookies in the request headers are checked 
            // to associate requests to corresponding VCR key
            clientIdCookieIndexMap[clientIdCookie] = vcrData.length - 1;
            chrome.storage.local.set({
                "vcr_data": vcrData,
                "client_id_cookie_index_map": clientIdCookieIndexMap,
                "request_counter": requestCounter
            }, function() {
                let newKeyDataStoreEndDate = Date.now();
                console.debug("New key data preparation and save: " + (newKeyDataStoreEndDate - newKeyDataStartDate) + " ms.\n")
                console.log("Saved VCR data, client ID cookie index map and request counter in storage: " + JSON.stringify(vcrData) + ", " + JSON.stringify(clientIdCookieIndexMap) + ", " + requestCounter);
              });

        }
        ).catch((error) => {
            alert('Error: ' + error);
        });

        return {responseHeaders: details.responseHeaders};
    },
    {urls: ["http://127.0.0.1/*"]},
    ["blocking", "responseHeaders", "extraHeaders"]
);