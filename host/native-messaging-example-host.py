#!/usr/bin/python3
import nativemessaging as nm
from fido2.hid import CtapHidDevice
import hashlib
import base64
import json

def send_message(message):
    nm.send_message(nm.encode_message(message))

def int_to_unsigned_bytes(num):
    return (num).to_bytes(4, byteorder='big', signed=False)

device = next(CtapHidDevice.list_devices(), None)

# # # Comment out below for the first time to generate
# # # Master private key.
# response = device.call(CTAPHID.VICEROY_KEYGEN, "NOT_IMPLEMENTED".encode())

while True:
    message = nm.get_message()
    if message != None:
        if device != None and message["purpose"] == "devkey":
            request_counter = message["data"]["request_counter"]
            key = device.call(0xA1, int_to_unsigned_bytes(int(request_counter)))
            send_message(str(key))
        elif device != None and message["purpose"] == "genvcr":
            path = message["data"]["derivation_path"]
            path_list = path.split("/")

            # We need to use "separators" to remove any whitespace which is added when python interprets a json string
            # https://docs.python.org/3/library/json.html: "Compact encoding"
            vcr_hash = hashlib.sha256(json.dumps(message["data"]["vcr"], separators=(',', ':')).encode())

            signature = device.call(0xA2, bytes.fromhex(vcr_hash.hexdigest()) + int_to_unsigned_bytes(int(path_list[1])) + int_to_unsigned_bytes(int(path_list[2])))

            response = {
                "vcr": message["data"]["vcr"],
                "signature": str(base64.b64encode(signature).decode())
            }
            send_message(response)
        elif device == None:
            send_message({"err": "No device!"})
        else:
            send_message({"err": "Incorrect purpose!"})
