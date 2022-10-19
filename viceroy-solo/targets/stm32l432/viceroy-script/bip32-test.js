const bip32 = require('./bip32.js');

var node = bip32.bip32.fromBase58("xprv9s21ZrQH143K33e9fbihy7jXGyePGxTqKQWKDntLWjs2MB7g3YQJSz3t7eE4TJC9NsVKiEQsjyvEs93auHzFrqYt9PKMhMEq2K76vuhzedt")

let device_key = node.derive(3).derive(5);

console.log(device_key.toBase58());


let hash = bip32.crypto.createHash("sha256").update("11111111111111111111111111111111").digest();

console.log(hash);

let sig = device_key.sign(hash);

console.log(Buffer.from(sig).toString("base64"));