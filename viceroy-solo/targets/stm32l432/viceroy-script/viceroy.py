from fido2.hid import CtapHidDevice, CTAPHID
import base64;

def int_to_unsigned_bytes(num):
    return (num).to_bytes(4, byteorder='big', signed=False)

device = next(CtapHidDevice.list_devices(), None)
print(device.product_name)

response = device.call(CTAPHID.PING, "test222".encode())

print("PING response from device: " + str(response))

# response = device.call(CTAPHID.WINK)

# print("WINK response: "  + str(response))

# # Comment out below for the first time to generate
# # Master private key.
# response = device.call(CTAPHID.VICEROY_KEYGEN, "NOT_IMPLEMENTED".encode())

# print("VICEROY_KEYGEN response: " + str(response))

response = device.call(CTAPHID.VICEROY_DEVKEY, int_to_unsigned_bytes(3))

print("VICEROY_DEVKEY response: " + str(response))

# Solokey will turn red to await for user input.
# Press button to generate VCR.
# This is the hash of "11111111111111111111111111111111"
response = device.call(CTAPHID.VICEROY_VCRGEN, bytes.fromhex("8a83665f3798727f14f92ad0e6c99fdab08ee731d6cd644c131223fd2f4fed2a") + int_to_unsigned_bytes(3) + int_to_unsigned_bytes(5))

print("VICEROY_VCRGEN response: " + str(base64.b64encode(response)))
