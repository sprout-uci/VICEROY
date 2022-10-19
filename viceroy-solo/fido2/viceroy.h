#include "viceroy_shared.h"
#include "bip32/bip32.h"


void viceroy_keygen(CTAPHID_WRITE_BUFFER *wb);

void viceroy_devkey(CTAPHID_WRITE_BUFFER *wb, int i);

void viceroy_vcrgen(CTAPHID_WRITE_BUFFER *wb, uint8_t *vcr_hash, int hash_len, int i, int j);