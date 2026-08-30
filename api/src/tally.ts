import * as PrivatePolling from '../../contract/src/managed/private-polling/contract/index.js';

/** Radix used by the contract's `encodeChoice` to pack three counts into one field element. */
const RADIX = 65536n;

export type DecryptedTally = {
  readonly yes: bigint;
  readonly no: bigint;
  readonly abstain: bigint;
};

/**
 * Recovers the plaintext tally from the accumulated ElGamal ciphertext and the combined
 * trustee decryption shares.
 *
 * Note what this function does *not* take: a secret key. Under threshold decryption the
 * combined share value is published on-chain once every trustee has contributed, so from
 * that moment the tally is publicly recoverable and anyone can run this — the organizer
 * is not a gatekeeper on the result being seen. Before then it returns nothing useful,
 * because the shares are incomplete.
 *
 * Exponential ElGamal leaves the result in the exponent — the aggregate decrypts to
 * `g^total`, not to `total` — so the counts are recovered by search. Two facts keep that
 * cheap rather than a general discrete log:
 *
 *   1. `total = yes + no*RADIX + abstain*RADIX^2` by construction, and
 *   2. `yes + no + abstain == ballotCount`, which is public.
 *
 * So only the `(yes, no)` pairs summing to at most `ballotCount` need testing —
 * O(ballotCount^2 / 2) candidates — and `abstain` follows. For a 1024-voter roll that is
 * a few hundred thousand curve operations; well within reach, though it is the reason the
 * roll depth is capped rather than unbounded.
 *
 * Returns `null` if no candidate matches, which means the shares are incomplete or do not
 * correspond to these ballots. Callers should surface that rather than publishing.
 */
export const decryptTally = (
  encTallyC2: unknown,
  combinedShares: unknown,
  ballotCount: bigint,
): DecryptedTally | null => {
  const target = JSON.stringify(encTallyC2);

  for (let yes = 0n; yes <= ballotCount; yes++) {
    for (let no = 0n; no <= ballotCount - yes; no++) {
      const abstain = ballotCount - yes - no;
      const total = yes + no * RADIX + abstain * RADIX * RADIX;
      const candidate = PrivatePolling.pureCircuits.tallyCandidate(
        total,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JubjubPoint is opaque here
        combinedShares as any,
      );
      if (JSON.stringify(candidate) === target) {
        return { yes, no, abstain };
      }
    }
  }
  return null;
};
