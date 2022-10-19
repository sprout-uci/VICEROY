To get the Javascript for BIP32 (https://github.com/bitcoinjs/bip32) from nodejs, we are using browserify (https://github.com/browserify/browserify).
This requires installing nodejs, bip32 and browserify (use `-g flag`) with `npm install [module_name]`.

The next step is to convert bip32 libraries to Javascript that can be `src`'ed in an HTML file. 
To do that, we first create a file `index.js` and export `bip32`. Then use `browserify index.js -s bip32js -o bip32.js` which bundles up required files for `index.js` into `bip32.js`.
This file can be imported into an HTML file. `-s` refers to this overall library, e.g., to use `fromBase58` we can do `bip32js.bip32.fromBase58(...)`.


External reference: https://www.mobilefish.com/developer/nodejs/nodejs_quickguide_browserify_bip32_utils.html

In case we need bip32-utils instead of bip32, the process similar -- copied below from above link. -- NOTE: bip32-utils depends on an old version of bitcoinjs-lib and should not be used. See https://github.com/bitcoinjs/bip32-utils/issues/15.

```
How to browserify node module bip32-utils


Information
Browserify will recursively analyze all the require() calls in your app in order to build a bundle you can serve up to the browser in a single <script> tag.

More information see:
http://browserify.org/
https://github.com/substack/node-browserify
https://github.com/bitcoinjs/bip32-utils

Operating system used
macOS 10.13. High Sierra

Software prerequisites
node.js


Procedure
Install browserify.
Type: npm install -g browserify

Show all installed node modules and their versions.
Type: npm -g ls --depth=0

You should see:
browserify@14.4.0

Show browserify help.
Type: browserify --help

In the following example the node module "bip32-utils" will be browserified.
More information about this module see: https://github.com/bitcoinjs/bip32-utils
bip32-utils is a small set of utilities for use with BIP32 HD key nodes. It can be used in node.js or can be in the browser with browserify, which will be demonstrated below.

Create a project directory.
Type: mkdir ~/bip32-utils

Install the node module bip32-utils locally inside this folder.
Type: cd ~/bip32-utils
Type: npm install bip32-utils

The node module bip32-utils is now installed in folder ~/bip32-utils/node_modules
I have installed bip32-utils-0.11.1

To show all installed modules and their versions inside folder ~/bip32-utils/, type:
cd ~/bip32-utils
npm ls --depth=0

It will show the error "UNMET PEER DEPENDENCY bitcoinjs-lib@^3.0.0"
npm no longer installs peer dependencies so you need to install them manually.

Type: npm install bitcoinjs-lib@^3.0.0

Check if the error is fixed, type: npm ls --depth=0

Create a file main.js inside this folder.
Type: touch ~/bip32-utils/main.js

Enter the following lines in file main.js

module.exports = {
    bitcoin: require('bitcoinjs-lib'),
    bip32utils: require('bip32-utils')
}

Note:
bip32-utils requires bitcoinjs-lib.
The name bitcoin and bip32utils are arbitrary chosen, but it is important later when calling the module in the web page.

To browserify the node module bip32-utils, the file main.js will be used as input. Browserify will go thru the main.js and will search all attached modules (= require()). Browserify will include the source of those "required" files in a new javascript file. The new javascript file can be given any name. In our example bip32_utils_browser.js. The bip32_utils_browser.js will contain the bip32-utils and bitcoinjs-lib sources.

Type: browserify main.js -s Bip32JS > bip32_utils_browser.js

Note:
By using the flag -s you assign the global variable name "Bip32JS" to the module.

The browserify can also transform the code.

Using flag -d
Type: browserify main.js -s Bip32JS -d > bip32_utils_browser.js

-d means include the source map information for easier debugging in the output bip32_utils_browser.js. Source map information will help you for better error tracing during development proces, but it will make the output file much larger.

To extract the source map information in a separate file:
Install node module exorcist: npm install -g exorcist
Type: browserify main.js -s Bip32JS -d | exorcist bip32_utils_browser.map.js > bip32_utils_browser.js
Now two files are created: bip32_utils_browser.js and bip32_utils_browser.map.js

An example how to use the bip32_utils_browser.js inside a web page see bip32_utils_example.html.

Copy the files bip32_utils_example.html and bip32_utils_browser.js to a webserver.
Open a browser and access the bip32_utils_example.html file.

```