# VICEROY-SOLO
- VICEROY-Solo is implemented as an extension to CTAP. See [fido2/ctaphid.c](fido2/ctaphid.c) for available commands.
- Implementations of VICEROY API is in [fido2/viceroy.c](fido2/viceroy.c).
- Accompanied script to communicate with a plugged in SoloKey is in [targets/stm32l432/viceroy-script](targets/stm32l432/viceroy-script).

This is a fork of the [original SoloKey repo](https://github.com/solokeys/solo).
For SoloKey development instructions, see below:

## Prereqs

1. Install packages from `apt`.

Ubuntu 18.04:
```
sudo apt install -y gcc-arm-none-eabi python3.6-venv
```

Ubuntu 20.04:
```
sudo apt install -y gcc-arm-none-eabi python3.8-venv python-is-python3
```

2. [Install Rust](https://www.rust-lang.org/tools/install) and add the `thumbv7em-none-eabihf` target.

```
rustup target add thumbv7em-none-eabihf
```

3. Install `solo-python`
```
pip3 install solo-python
```

### Note on `gcc-arm-none-eabi` and Ubuntu18.04
* According to [this issue](https://github.com/solokeys/solo/issues/36), building the firmware requires `gcc-arm-none-eabi` to be at least above version **7.3.1**.
* If you are running Ubuntu 18.04, chances are you are running something lower.
* Instructions on upgrading `gcc-arm-none-eabi`:
  * Remove `gcc-arm-none-eabi` (if installed in system)
  * Download latest version from [here](https://developer.arm.com/tools-and-software/open-source-software/developer-tools/gnu-toolchain/gnu-rm/downloads)
  * Follow the instructions shown [here](https://askubuntu.com/questions/1243252/how-to-install-arm-none-eabi-gdb-on-ubuntu-20-04-lts-focal-fossa/1243405#1243405) to unpack and link the new binaries. The necessary binaries are: `arm-none-eabi-gcc, arm-none-eabi-size, arm-none-eabi-objcopy, arm-none-eabi-as`
  * Run `gcc-arm-none-eabi --version` to check whether correct version is installed


## Building

If you have the toolchain installed on your machine you can build the firmware with:

```bash
cd solo
git submodules update --init --recursive
pip3 install -r tools/requirements.txt

cd targets/stm32l432
make cbor
make salty
make firmware
```

### Debug build
Solokey allows debug messages to be sent via a USB serial port.
To use this, build the firmware using `make firmware-debug-1` or `make firmware-debug-2` instead of `make firmware` in the previous section.

The two debugging settings have the following differences:
* `make firmware-debug-1`: Outputs debug messages through serial interface. Device boots up whether or not a serial interface is attached.
* `make firmware-debug-2`: Does not boot up the Solokey until a serial interface is attached. This is to obtain all debug messages.

See [here](https://docs.solokeys.dev/building/#building-with-debug-messages) and the [Debugging Solokey](#debugging-solokey) section for more information.

## Plugging in Solokey
Check whether Solokey is recognized by the system.
This requires a new rule for udev to be installed.
```
cd solo/udev
make setup
```

Then plug in Solokey and run 
```
solo ls
```
to see whether your system recognizes Solokey.

## Installing new firmware to Solokey
To install the new firmware built above, follow the next steps:
```bash
cd solo
make venv
source venv/bin/activate
solo program aux enter-bootloader
solo program bootloader targets/stm32l432/solo.hex
```

## Debugging Solokey
Compiling the firmware with debug features (see [Debug build](#debug-build) section) lets us obtain outputs from the Solokey to a serial interface running on the computer.

### Finding the serial port
Remove and plug in the Solokey and run
```bash
sudo dmesg | grep tty
```
The most recent entry should reveal the serial port used by Solokey, (e.g., `ttyACM0`, `ttyUSB0`)

### Use `solo-python` to create serial interface
Run
```
solo monitor [serial port]
```

### Workaround if `solo monitor` does not work
In some cases, `solo monitor` returns an error.
Here, we show how to use `minicom` instead.

#### Install and setup `minicom`
```
sudo apt install minicom
sudo minicom -s
```

Select `Serial port setup` and enter the serial port found [here](#finding-the-serial-port).
For more information, refer to [this document](https://www.cyberciti.biz/tips/connect-soekris-single-board-computer-using-minicom.html)

If there are odd indentation in the output of `minicom`, fix it by editing the configuration file:
```
sudo vim /etc/minicom/minirc.dfl
```
and adding `pu addcarreturn Yes` to the end of the file.

#### Basic `minicom` usage
* `sudo minicom`: Uses the `/etc/minicom/minirc.dfl` config file and opens `minicom`
    * `-s`: Allows user to change settings and enters `minicom` after that
    * `-con`: Enables color display
* `Ctrl-A + X` (within `minicom`): Exits minicom
* `Ctrl-A + Z` (within `minicom`): Opens help menu

### What to do with unresponsive Solokey
Sometimes Solokey may become unresponsive after updating the firmware and may even not show up using `solo ls`.
Here are steps to recover your Solokey from this state:
1. Unplug Solokey from computer.
1. Hold down the physical button on Solokey and plug it into the computer while holding down the button.
    * This forces Solokey to enter bootloader mode.
1. Make sure that Solokey is blinking green and yellow.
    * If not, return to Step 1 and try holding down the button for a longer period of time after plugging it into the computer.
1. Run `solo program bootloader solo.hex` to upload a new firmware.
    * Chances are that your firmware is causing the unresponsive Solokey. Double check your code before doing this!!

See [here](https://github.com/solokeys/solo1/issues/497) for more information.
