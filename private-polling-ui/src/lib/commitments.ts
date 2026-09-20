import { hexToBytes, isHex32 } from '../private-state/hex';

/** Splits pasted text into commitments and reports which entries are malformed. */
export const parseCommitments = (text: string): { valid: Uint8Array[]; invalid: string[] } => {
  const entries = text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const valid: Uint8Array[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    if (!isHex32(entry)) {
      invalid.push(entry);
      continue;
    }
    const normalized = entry.replace(/^0x/i, '').toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    valid.push(hexToBytes(normalized));
  }
  return { valid, invalid };
};
