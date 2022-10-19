# Directory structure
- `app`: Chrome extension
- `bip32`: NodeJS BIP32 library converted into JavaScript
- `host`: Application running on host that talks with Server via Chrome extension
- `server`: Custom server exposing VICEROY cookie wrapper & VCR APIs
- `viceroy-solo`: Custom Solokey firmware for VICEROY
- `tamarin`: VICEROY protocol specification via [Tamarin prover](https://tamarin-prover.github.io/)

# Initialize
> NOTE: We currently only support Linux.

## `app` (Chrome Extension)
- Install and open Google Chrome browser.
- Navigate to `chrome://extensions`.
- Enable Developer mode (right upper corner).
- Click on `Load unpacked` (left upper corner).
- Select the `app/` folder.

## `host` (Native Application)
- Install Node.js (https://nodejs.org/en/download/)
- Run `npm install` in the host directory.
- To use Chrome native messaging:
  - With Solokey (see `viceroy-solo` for more information):
    - Install necessary packages: `pip3 install fido2 nativemessaging`
    - Run `install_host.sh solo` script in the `host` directory.
  - Without Solokey:
    - Run `install_host.sh nosolo` script in the `host` directory.
 
## `server`
- Install Node.js (https://nodejs.org/en/download/)
- Run `npm install` in the server directory.
- Run `node server.js` in the server directory.
- Confirm output VCR server info.

## `viceroy-solo`
- Follow the `README` in the directory to setup the Solokey for VICEROY.

# Test 
> NOTE: If you are going to use Solokey, SoloKey must be plugged in and environment to be set up as instructed in `viceroy-solo` directory.
- Navigate to `http://127.0.0.1:3030/`
- Confirm session initiation
  - Press F12 for developer console.
  - Click on the Application tab.
  - Click on Cookies on the left-hand side.
  - Confirm cookie with `client_id` is set.
- Click on the extension popup (next to the URL bar).
- Confirm a session is listed.
- Go to `http://127.0.0.1:3030/test`.
- Confirm `/test` is listed under the session on the popup.
- Click on the session checkbox.
- Select a VCR type (ACCESS/MODIFY/DELETE). Currently ACCESS and DELETE are implemented for client visit history which the server keeps.
- Click on the Send Request button.
- Confirm server response of visited sites.

# Analysis of VICEROY protocol via Tamarin prover
## Prerequisites
Install Tamarin prover via `Homebrew`:
```
brew install tamarin-prover/tap/tamarin-prover
```

You can also downlowad the Tamarin prover binary from [Github](https://github.com/tamarin-prover/tamarin-prover/releases/tag/1.6.0).
> NOTE: The latest release `1.6.1` does not have a Linux binary.

## Running Tamarin prover
For each file in the `tamarin` folder, run the following:
```
tamarin-prover [your_file].spthy --prove
```
You should see `verified` for each property that is aimed to be proved.
