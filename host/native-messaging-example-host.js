#!/usr/bin/env node

const bip32 = require('bip32');
const crypto = require('crypto');
const fs = require('fs');
eval(fs.readFileSync('../app/keyMap.js')+'');

var sendMessage = require('native-messaging')(handleMessage)

var node = bip32.fromBase58('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi')

function handleMessage (request) {
  // Derive key using the path
  let vcrKey = node.derivePath(request[keyMap["derivation_path"]]);
  // Compare keys
  if (vcrKey.publicKey.toString("base64") !== request[keyMap["vcr"]][keyMap["vcr_key"]]) {
    sendMessage({"err": "derived_key_vcr_key_mismatch"});
    return;
  }

  let vcrHash = crypto.createHash('sha256').update(JSON.stringify(request[keyMap["vcr"]])).digest();
  let signature = vcrKey.sign(vcrHash);

  sendMessage({
    [keyMap["vcr"]]: request[keyMap["vcr"]],
    [keyMap["signature"]]: Buffer.from(signature).toString("base64")
  });
}

 // Sample VCR
 // {"vcr":{"action":"access","vcr_key":"AnVt4YLF3Utxfqh+aTAG2mLbs83apKXK0u0fW7q3VfD1","client_id_cookie_name":"client_id","client_id_cookie_value":"69","vcr_challenge":"NrRLUdbPPKAQTytsc9kNgg==","metadata":{"encryption_public_key":"SoMeKeY"}},"key_derivation_path":"m/0/0"}