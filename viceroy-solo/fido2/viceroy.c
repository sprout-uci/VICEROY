#include "viceroy.h"
#include "log.h"
#include "bip32/bip32.h"
#include <string.h>

#define SEED_LENGTH_IN_BYTES 16
#define CURVE "secp256k1"
#define VERSION_PUBLIC  0x0488b21e
#define VERSION_PRIVATE 0x0488ade4
#define MASTER_PRIVATE_KEY_STORE_INDEX 0

// Helper Functions
void send_out_error(CTAPHID_WRITE_BUFFER * wb, char *function_name, int ret) {
    char out_buf[100];
    int len = snprintf(out_buf, 100, "%s return value: %d", function_name, ret);
    wb->bcnt = len;
    ctaphid_write(wb, out_buf, len);
    ctaphid_write(wb, NULL, 0);
}

void send_out_buf(CTAPHID_WRITE_BUFFER * wb, char *buf, int len) {
    wb->bcnt = len; 
    ctaphid_write(wb, buf, wb->bcnt);
    ctaphid_write(wb, NULL, 0);
}

// load_master_private_key sends debug info out when errors.
int load_master_private_key(CTAPHID_WRITE_BUFFER * wb, HDNode *root) {
    // Load the master private key from storage
    const char key_str_buf[128];
    int ret = ctap_load_key(MASTER_PRIVATE_KEY_STORE_INDEX, key_str_buf);
    if (ret != 0) {
        send_out_error(wb, "ctap_load_key", ret);
        return -1;
    }
    int len = ctap_key_len(MASTER_PRIVATE_KEY_STORE_INDEX);

    // Deserialize stored key
    uint32_t fp = 0;
    uint32_t version = VERSION_PRIVATE;
    ret = hdnode_deserialize_private((char *) key_str_buf, version, CURVE, root, &fp);

    if (ret != 0) {
        send_out_error(wb, "hdnode_deserialize_private", ret);
        return -1;
    }
    
    // Fill out the public key field
    ret = hdnode_fill_public_key(&root);
    if (ret != 0) {
        send_out_error(wb, "hdnode_fill_public_key", ret);
        return -1;
    }
    return 0;
}
//


/**
 * @brief Wipes out all credentials and generates a new BIP32 private master key and stores it.
 */
void viceroy_keygen(CTAPHID_WRITE_BUFFER *wb) {
    printf1(TAG_HID, "CTAPHID_VICEROY_KEYGEN\n");

    // Wipe out all credentials
    ctap_reset();
    
    // const uint8_t *xprv_key_base58 = (uint8_t *) "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi";
    // HDNode *node = malloc(sizeof(HDNode));
    // uint32_t fp = 0;
    // uint32_t version = VERSION_PRIVATE;
    // int ret = hdnode_deserialize_private((char *) xprv_key_base58, version, "secp256k1", node, &fp);

    // Generate a random seed
    uint8_t seed_buf[SEED_LENGTH_IN_BYTES];
    memset(seed_buf, 0, SEED_LENGTH_IN_BYTES);
    int ret = ctap_generate_rng(seed_buf, SEED_LENGTH_IN_BYTES);
    if (ret != 1) {
        send_out_error(wb, "ctap_generate_rng", ret);
        return;
    }

    // Generate BIP32 private master key node
    HDNode root;
    ret = hdnode_from_seed(seed_buf, SEED_LENGTH_IN_BYTES, CURVE, &root);
    if (ret != 1) {
        send_out_error(wb, "hdnode_from_seed", ret);
        return;
    }

    // Serialize the master private key for sending out
    const char key_str_buf[128];
    int key_str_len = hdnode_serialize_private(&root, 0, VERSION_PRIVATE, (char *)key_str_buf, 128);

    // Store the serialized key.
    ret = ctap_store_key(MASTER_PRIVATE_KEY_STORE_INDEX, key_str_buf, key_str_len);
    if (ret == ERR_NO_KEY_SPACE || ret == ERR_KEY_SPACE_TAKEN)
    {
        send_out_error(wb, "ctap_store_key", ret);
        return;
    }

    // Send out the private key.
    send_out_buf(wb, key_str_buf, key_str_len);
}

/**
 * @brief Generates a BIP32 device public key from stored private master key using a child index. Key path: m/i
 */
void viceroy_devkey(CTAPHID_WRITE_BUFFER *wb, int i) {
    HDNode root;
    int ret = load_master_private_key(wb, &root);
    if (ret != 0) {
        return;
    }
    // Save the fingerprint parent fingerprint before derivation so that we can use it later
    // (Spend hours figuring out this line needs to be added. 
    // Why is this parent fingerprint not included to the HDNode during derivation anyway???)
    int fingerprint = hdnode_fingerprint(&root);

    // Derive child public key with index
    // Root is reused to store the derived child public key
    ret = hdnode_public_ckd(&root, i);
    if (ret != 1) {
        send_out_error(wb, "hdnode_public_ckd", ret);
        return;
    }
    hdnode_fill_public_key(&root);

    // Serialize the public key
    const char child_key_str_buf[128];
    int child_key_str_len = hdnode_serialize_public(&root, fingerprint, VERSION_PUBLIC, (char *)child_key_str_buf, 128);

    // Send the key outside
    send_out_buf(wb, child_key_str_buf, child_key_str_len);
}

void viceroy_vcrgen(CTAPHID_WRITE_BUFFER *wb, uint8_t *vcr_hash, int hash_len, int i, int j) {
    // Test whether we get i and j correctly.
    // char out_buf[100];
    // int len = snprintf(out_buf, 100, "i: %d, j: %d", i, j);
    // wb->bcnt = len;
    // ctaphid_write(wb, out_buf, len);
    // ctaphid_write(wb, NULL, 0);

    HDNode root;
    int ret = load_master_private_key(wb, &root);
    if (ret != 0) {
        return;
    }

    ret = hdnode_fill_public_key(&root);
    if (ret != 0) {
        send_out_error(wb, "hdnode_fill_public_key", ret);
        return;
    }
    
    uint32_t fingerprint = hdnode_fingerprint(&root);

    // m/i
    ret = hdnode_private_ckd(&root, i);
    if (ret != 1) {
        send_out_error(wb, "hdnode_private_ckd_prime", ret);
        return;
    }
    ret = hdnode_fill_public_key(&root);
    if (ret != 0) {
        send_out_error(wb, "hdnode_fill_public_key", ret);
        return;
    }

    // Save parent fingerprint to be used for serialization later.
    fingerprint = hdnode_fingerprint(&root);

    // m/i'/j
    ret = hdnode_private_ckd(&root, j);
    if (ret != 1) {
        send_out_error(wb, "hdnode_private_ckd", ret);
        return;
    }

    ret = hdnode_fill_public_key(&root);
    if (ret != 0) {
        send_out_error(wb, "hdnode_fill_public_key", ret);
        return;
    }

    // const char key_str_buf[128];
    // int key_str_len = hdnode_serialize_private(&root, fingerprint, VERSION_PRIVATE, (char *)key_str_buf, 128);
    // send_out_buf(wb, key_str_buf, key_str_len);

    if (ctap_user_presence_test(5000))
    {
        // Sign the received VCR hash (32 bytes)
        int sig_len = 64;
        uint8_t sig[sig_len];
        uint8_t sig_recovery_byte = 0;
        ret = hdnode_sign_digest(&root, vcr_hash, sig, &sig_recovery_byte, NULL);
        if (ret != 0)
        {
            send_out_error(wb, "hdnode_sign_digest", ret);
            return;
        }

        send_out_buf(wb, sig, sig_len);
    }
    else
    {
        send_out_error(wb, "ctap_user_presence_test", -1);
    }
}