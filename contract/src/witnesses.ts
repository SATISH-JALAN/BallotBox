/*
 * Private Polling contract private state and witnesses.
 */

import type { Ledger } from "./managed/private-polling/contract/index.js";
import {
  WitnessContext,
  type MerkleTreePath,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { pureCircuits } from "./managed/private-polling/contract/index.js";

/**
 * Order of the Jubjub prime-order subgroup. Every scalar handed to `ecMul` /
 * `ecMulGenerator` is reduced mod this, so a derived value always lands in range.
 */
const JUBJUB_ORDER =
  6554484396890773809930967563523245729705921265872317281365359162392183254199n;

export type PrivatePollingPrivateState = {
  readonly secretKey: Uint8Array;
  /**
   * The ballot this wallet is about to cast, staged here because `castVote` takes no
   * arguments — the choice reaches the circuit as a *witness*, never as a public
   * transaction input. That indirection is the whole point: a circuit argument would
   * be visible on-chain, which is exactly the leak this design removes.
   */
  readonly pendingChoice?: number;
};

export const createPrivatePollingPrivateState = (
  secretKey: Uint8Array,
  pendingChoice?: number,
): PrivatePollingPrivateState => ({ secretKey, pendingChoice });

/** Interprets bytes as a big-endian integer reduced into the scalar field. */
const scalarFromBytes = (bytes: Uint8Array): bigint => {
  let acc = 0n;
  for (const byte of bytes) acc = (acc << 8n) | BigInt(byte);
  return acc % JUBJUB_ORDER;
};

/**
 * The organizer's tally secret `x`, derived deterministically from their secret key.
 *
 * Deriving rather than storing a separate key means there is no extra secret to back up
 * or lose — recovering the wallet recovers the ability to decrypt the tally. It is
 * domain-separated from every other use of the same key.
 */
export const deriveTallySecret = (secretKey: Uint8Array): bigint =>
  scalarFromBytes(pureCircuits.voteNullifier(secretKey, TALLY_DOMAIN));

const TALLY_DOMAIN = new TextEncoder().encode("tally".padEnd(32, "\0"));

/**
 * An all-zero path, returned when this voter's commitment is not in the eligibility
 * roll. A witness cannot fail — it has to return *something* — so returning a path that
 * will not reconcile against the on-chain root lets the circuit's own `checkRoot` assert
 * produce the rejection instead. The voter learns they are not enrolled; the contract
 * learns nothing extra.
 */
const unenrolledPath = (leaf: Uint8Array): MerkleTreePath<Uint8Array> => ({
  leaf,
  path: Array.from({ length: 10 }, () => ({
    sibling: { field: 0n },
    goes_left: false,
  })),
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, PrivatePollingPrivateState>): [
    PrivatePollingPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  /**
   * Supplies the voter's authentication path into the eligibility tree. Derived locally
   * from the public roll plus this wallet's own secret key, and passed to the circuit as
   * a private input — so proving membership never discloses *which* member is voting.
   */
  eligibilityPath: ({
    privateState,
    ledger,
  }: WitnessContext<Ledger, PrivatePollingPrivateState>): [
    PrivatePollingPrivateState,
    MerkleTreePath<Uint8Array>,
  ] => {
    const leaf = pureCircuits.voterCommitment(privateState.secretKey);
    const path = ledger.eligibility.findPathForLeaf(leaf);
    return [privateState, path ?? unenrolledPath(leaf)];
  },

  /** The staged ballot. Never disclosed; the circuit constrains it to 0, 1, or 2. */
  ballotChoice: ({
    privateState,
  }: WitnessContext<Ledger, PrivatePollingPrivateState>): [
    PrivatePollingPrivateState,
    bigint,
  ] => [privateState, BigInt(privateState.pendingChoice ?? 0)],

  /**
   * Fresh ElGamal blinding factor for this ballot.
   *
   * Drawn from the system CSPRNG on every call, and deliberately *not* derived from the
   * secret key: a deterministic value would make two ballots for the same choice encrypt
   * identically, which would let an observer group voters by how they voted — reopening
   * the very leak the encryption closes.
   */
  ballotRandomness: ({
    privateState,
  }: WitnessContext<Ledger, PrivatePollingPrivateState>): [
    PrivatePollingPrivateState,
    bigint,
  ] => {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return [privateState, scalarFromBytes(bytes)];
  },

  /** The organizer's tally secret. Only read inside `publishTally`, never disclosed. */
  tallySecretKey: ({
    privateState,
  }: WitnessContext<Ledger, PrivatePollingPrivateState>): [
    PrivatePollingPrivateState,
    bigint,
  ] => [privateState, deriveTallySecret(privateState.secretKey)],
};
