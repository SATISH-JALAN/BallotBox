import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { PollState } from '../../contract/src/managed/private-polling/contract/index.js';
import type { PrivatePollingPrivateState } from '../../contract/src/index';

export const privatePollingPrivateStateKey = 'privatePollingPrivateState';
export type PrivateStateId = typeof privatePollingPrivateStateKey;

export type PrivateStates = {
  readonly privatePollingPrivateState: PrivatePollingPrivateState;
};

// The Compact-generated `Contract` class doesn't declare `provableCircuits`, which
// `midnight-js-contracts`'s `Contract.Any` constraint requires — `any` bridges that gap.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrivatePollingContract = any;

export type PrivatePollingCircuitKeys =
  | 'createPoll'
  | 'registerTrustee'
  | 'enrollVoter'
  | 'selfEnroll'
  | 'checkIn'
  | 'openVoting'
  | 'castVote'
  | 'closeVoting'
  | 'submitDecryptionShare'
  | 'publishTally';

/** Every circuit that submits a transaction, in lifecycle order. */
export const PRIVATE_POLLING_CIRCUITS: readonly PrivatePollingCircuitKeys[] = [
  'createPoll',
  'registerTrustee',
  'enrollVoter',
  'selfEnroll',
  'openVoting',
  'castVote',
  'closeVoting',
  'submitDecryptionShare',
  'publishTally',
  'checkIn',
];

/** Where a submitted transaction landed — enough to link to it in a block explorer. */
export type TxReceipt = {
  readonly txHash: string;
  readonly blockHeight: number;
};

export type CreatePollOptions = {
  /** When voting closes. Omit for no deadline. */
  readonly deadline?: Date;
  /** Minimum ballots for a binding result. 0 or omitted for none. */
  readonly quorum?: number;
  /** Let any wallet enrol itself. Defaults to organizer-only enrollment. */
  readonly openEnrollment?: boolean;
};

export type PrivatePollingProviders = MidnightProviders<
  PrivatePollingCircuitKeys,
  PrivateStateId,
  PrivatePollingPrivateState
>;

export type DeployedPrivatePollingContract = FoundContract<PrivatePollingContract>;

export type PrivatePollingDerivedState = {
  readonly pollState: PollState;
  readonly pollQuestion: string | undefined;
  readonly sequence: bigint;
  readonly isOwner: boolean;
  /** Whether this wallet deployed the contract, and so may start new polls on it. */
  readonly isAdmin: boolean;
  /** Whether any wallet may enrol itself in the current poll. */
  readonly openEnrollment: boolean;
  /** Distinct wallets that have checked in on this contract, across every poll. */
  readonly participantCount: bigint;
  /** Whether the connected wallet is in the participant set. */
  readonly hasCheckedIn: boolean;
  /** Ballots cast so far. Public by design — turnout is a legitimate public fact. */
  readonly ballotCount: bigint;
  /** Whether the organizer has decrypted and published the result. */
  readonly tallied: boolean;
  /** Unix seconds after which ballots are refused on-chain. 0 means no deadline. */
  readonly votingDeadline: bigint;
  /** Minimum ballots for the result to be binding. 0 means no quorum requirement. */
  readonly quorum: bigint;
  /** Whether quorum was reached. Only meaningful once `tallied` is true. */
  readonly quorumMet: boolean;
  /** Registered decryption trustees. The tally needs a share from every one of them. */
  readonly trusteeCount: bigint;
  /** Shares submitted so far. Decryption is possible only once this equals trusteeCount. */
  readonly shareCount: bigint;
  /** Whether this wallet is a registered trustee for the current poll. */
  readonly isTrustee: boolean;
  /** Whether this wallet has already submitted its decryption share. */
  readonly hasSubmittedShare: boolean;
  /** Final counts. All zero until `tallied` is true — they do not exist before then. */
  readonly finalYes: bigint;
  readonly finalNo: bigint;
  readonly finalAbstain: bigint;
  /** How many voters the organizer has enrolled in the eligibility roll. */
  readonly enrolledCount: bigint;
  /** Whether this wallet is on the roll, and so may cast a ballot. */
  readonly isEligible: boolean;
  /**
   * Whether this wallet has a ballot recorded in the current poll. Re-voting is allowed
   * and replaces it, so this means "you have voted", not "you may not vote again".
   */
  readonly hasVoted: boolean;
  /**
   * This wallet's enrolment commitment, hex-encoded — hand it to the organizer to be
   * added to the roll. It is a one-way hash of the secret key, so sharing it exposes
   * neither the key nor a link to the ballot later cast with it.
   */
  readonly myCommitment: string;
};

// ── Vote choices ────────────────────────────────────────────────────────────
//
// The `castVote` circuit takes a `Uint<8>` and asserts `choice <= 2`. Encoding that
// contract in the type system keeps the three call sites (CLI, UI, API) from passing
// a bare number that only fails deep inside proof generation.

export const VoteChoice = {
  Yes: 0,
  No: 1,
  Abstain: 2,
} as const;

export type VoteChoice = (typeof VoteChoice)[keyof typeof VoteChoice];

export const VOTE_CHOICE_LABELS: Readonly<Record<VoteChoice, string>> = {
  [VoteChoice.Yes]: 'Yes',
  [VoteChoice.No]: 'No',
  [VoteChoice.Abstain]: 'Abstain',
};

/** Narrows an arbitrary number to a `VoteChoice`, mirroring the circuit's `choice <= 2`. */
export const isVoteChoice = (value: number): value is VoteChoice =>
  Number.isInteger(value) && value >= VoteChoice.Yes && value <= VoteChoice.Abstain;
