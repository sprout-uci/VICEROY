var keyDataNodes;

var userClickSendRequestDate = null;
var serverVCRVerifyResponseDate = null;
var nativeReturnMessageDate = null;

$("#sendRequestButton").click(
	function() {
		userClickSendRequestDate = Date.now();
		let checkedNodes = $('#tree').treeview('getChecked');
		keyDataNodes = [];
		for (let i = 0; i < checkedNodes.length; i++) {
			if ("keyData" in checkedNodes[i]) {
				keyDataNodes.push(checkedNodes[i].keyData);
			}
		}
		let action = $('.active').data().title; // access/modify/delete
		console.log("Requested action: " + action); 	
		for (let i = 0; i < keyDataNodes.length; i++) {
			let vcr = generateVCR(keyDataNodes[i], action);
			// Send the VCR to the background script for signing
			let message = {
				"purpose": "genvcr",
				"data": vcr
			};
			chrome.runtime.sendMessage(message);
		}
	}
);


function findCorrespondingKeyDataNode(vcrKey) {
	for (let i = 0; i < keyDataNodes.length; i++) {
		if (keyDataNodes[i][keyMap["vcr_key"]] === vcrKey) {
			return keyDataNodes[i];
		}
	}
	return null;
}

chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
	nativeReturnMessageDate = Date.now();
	console.debug("Time it took from userClickSendRequestDate to nativeReturnMessageDate: " + (nativeReturnMessageDate - userClickSendRequestDate) + " ms.");
    console.log("Message received in popup script from background script: " + JSON.stringify(response));
    // Find the corresponding key data node for this VCR using the public key
    let keyDataNode = findCorrespondingKeyDataNode(response[keyMap["vcr"]][keyMap["vcr_key"]]);
    if (keyDataNode == null) {
    	alert("FAIL: Couldn't find corresponding key data node.");
    	return;
    } else {
    	console.log("Found corresponding key data node: " + JSON.stringify(keyDataNode));
    }

    // Add the cookie wrapper
    response[keyMap["cookie_wrapper"]] = keyDataNode[keyMap["cookie_wrapper"]];

	fetch(keyDataNode[keyMap["vcr_verify_endpoint"]], {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
	  },
    	body: JSON.stringify(response)
    }).then(
        res => res.json()
    ).then(function(data) {
    	serverVCRVerifyResponseDate = Date.now();
    	console.debug("Time it took from to userClickSendRequestDate to serverVCRVerifyResponseDate: " + (serverVCRVerifyResponseDate - userClickSendRequestDate) + " ms.");
    	serverResponse = JSON.stringify(data);
    	console.log("Data returned from server: " + serverResponse);
    	$("#serverResponseTextArea").val(serverResponse);
    }
    ).catch((error) => {
        alert('Error: ' + error);
    });


});

function generateVCR(keyData, action) {
	console.log("Generating VCR (" + action + ")" + " for key data: " + JSON.stringify(keyData));
	vcr = {
		[keyMap["action"]]: action,
		[keyMap["vcr_key"]]: keyData[keyMap["vcr_key"]],
		[keyMap["client_id_cookie"]]: keyData[keyMap["client_id_cookie"]],
		[keyMap["vcr_challenge"]]: keyData[keyMap["vcr_challenge"]]
	};
	// Append metadata
	if (action === "access") {
		// // metadata for access is removed, as we assume TLS.
		// // This will be necessary when we move to non-TLS design.
		// vcr[keyMap["metadata"]] = {[keyMap["encryption_public_key"]]: "SoMeKeY"};
	} else if (action === "modify") {
		vcr[keyMap["metadata"]] = {"dataToModify": "NeWVaLuE"};
	} else if (action === "delete") {
		vcr[keyMap["metadata"]] = {"dataToDelete": "ToDeLeTe"};
	} else {
		alert("Unknown action: " + action);
		return;
	}
	let vcrData = {
		[keyMap["vcr"]]: vcr,
		[keyMap["derivation_path"]]: keyData[keyMap["derivation_path"]]
	};
	console.log("VCR to send to the background script: " + JSON.stringify(vcrData));
	return vcrData;
}


function checkNodes(event, node, check) {
	// If the node with the event is a history node, undo the event (e.g., uncheck if checked)
	if (!("nodes" in node)) {
		console.log(event);
		let action = event.type === "nodeChecked" ? "uncheckNode" : "checkNode";
		$('#tree').treeview(action, [node.nodeId, {silent: true}]);
		return;
	}
	// If the node with the event is a key node, check/uncheck its children as well
	let action = check ? 'checkNode' : 'uncheckNode';
	for (let i = 0; i < node.nodes.length; i++) {
		$('#tree').treeview(action, [node.nodes[i].nodeId, {silent: true}]);
	}
}

chrome.storage.local.get({vcr_data: []}, function(result) {
	let vcrData = result.vcr_data;
    console.log("Loaded VCR data: " + JSON.stringify(vcrData));
	let tree = [];
	for (let i = 0; i < vcrData.length; i++) {
		// A key corresponds to a session for one host. We can use any of the history URLs.
		let hostName = new URL(vcrData[i][keyMap["url_origin"]]).hostname;
		
		// Prepare a new node for this host
		let hostNode = null;
		hostNode = {
			"text": hostName + " SID: " + vcrData[i][keyMap["vcr_key"]].substring(0, 16), 
			"selectable": false,
			"keyData": vcrData[i]
		};
		// Prepare its children
		hostNode.nodes = [];
		tree.unshift(hostNode);

		for (let j = 0; j < vcrData[i][keyMap["history"]].length; j++) {
			// Date is too long, let's show a shortened version
			let dateToShorten = new Date(vcrData[i][keyMap["history"]][j][keyMap["date"]]);
			let dateToShow = dateToShorten.toLocaleDateString() + " " + dateToShorten.toLocaleTimeString();

			// Append this visit to the host
			let path = vcrData[i][keyMap["history"]][j][keyMap["path"]];
			hostNode.nodes.unshift({
				"text": path + " " + dateToShow,
				"selectable": false
			});
		}
	}
	// Add some sample data
	// tree.push({"text": "google.com", "selectable": false, nodes: [{"text": "/GDPR 10/12/2020 02:27:21 PM"}]});
	// tree.push({"text": "facebook.com", "selectable": false, nodes: [{"text": "/profile 10/1/2020 09:12:38 AM", "selectable": false}, {"text": "/photos 10/2/2020 11:34:52 AM"}]});
	$('#tree').treeview({
		"data": tree, 
		"multiselect": true, 
		"showCheckbox": true, 
		"expandIcon": "glyphicon glyphicon-chevron-right", 
		"collapseIcon": "glyphicon glyphicon-chevron-down",
		onNodeChecked: function (event, node) {
			checkNodes(event, node, true);
		},
		onNodeUnchecked: function (event, node) {
			checkNodes(event, node, false);
		}
	});
	$('#tree').treeview('collapseAll', { silent: true });
	$('.indent').removeClass('glyphicon-unchecked');
});