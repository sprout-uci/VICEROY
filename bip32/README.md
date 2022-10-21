To get the Javascript for [BIP32](https://github.com/bitcoinjs/bip32) from nodejs, we are using [browserify](https://github.com/browserify/browserify).
This requires installing nodejs, bip32 and browserify (use `-g flag`) with `npm install [module_name]`.

The next step is to convert bip32 libraries to Javascript that can be `src`'ed in an HTML file. 
To do that, we first create a file `index.js` and export `bip32`. Then use `browserify index.js -s bip32js -o bip32.js` which bundles up required files for `index.js` into `bip32.js`.
This file can be imported into an HTML file. `-s` refers to this overall library, e.g., to use `fromBase58` we can do `bip32js.bip32.fromBase58(...)`.


External reference: https://www.mobilefish.com/developer/nodejs/nodejs_quickguide_browserify_bip32_utils.html

In case we need bip32-utils instead of bip32, the process similar -- copied below from above link.
> NOTE: bip32-utils depends on an old version of bitcoinjs-lib and should not be used. See https://github.com/bitcoinjs/bip32-utils/issues/15.