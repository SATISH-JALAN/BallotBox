export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Parses hex (optionally 0x-prefixed). Throws on odd length or non-hex input. */
export const hexToBytes = (hex: string): Uint8Array => {
  const cleaned = hex.trim().replace(/^0x/i, '');
  if (cleaned.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error('Expected an even-length hex string.');
  }
  return Uint8Array.from(cleaned.match(/../g) ?? [], (byte) => parseInt(byte, 16));
};

export const isHex32 = (value: string): boolean => /^(0x)?[0-9a-fA-F]{64}$/.test(value.trim());
