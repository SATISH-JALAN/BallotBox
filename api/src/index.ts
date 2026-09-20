import * as PrivatePolling from '../../contract/src/managed/private-polling/contract/index.js';

import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type PrivatePollingDerivedState,
  type PrivatePollingContract,
  type PrivatePollingProviders,
  type DeployedPrivatePollingContract,
  type PrivatePollingCircuitKeys,
  type CreatePollOptions,
  type TxReceipt,
  type VoteChoice,
  privatePollingPrivateStateKey,
  isVoteChoice,
} from './common-types.js';
import { CompiledPrivatePollingContractContract } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { PrivatePollingPrivateState, createPrivatePollingPrivateState } from '../../contract/src/witnesses.js';
import { decryptTally, type DecryptedTally } from './tally.js';
import { PollState } from '../../contract/src/managed/private-polling/contract/index.js';

/**
 * The sequence bytes the contract actually derives `owner` and `admin` from.
 *
 * The contract computes `derivedPublicKey(sk, pad(32, "0"))`, and Compact's `pad` emits
 * the ASCII bytes of the string `"0"` zero-padded to 32 — that is `[0x30, 0x00 × 31]`,
 * not the `sequence` counter and not 32 zero bytes. Deriving from `sequence` here made
 * `isOwner` permanently false, so the creator never saw their own controls.
 */
const OWNER_SEQUENCE = ((): Uint8Array => {
  const bytes = new Uint8Array(32);
  bytes[0] = 0x30; // '0'
  return bytes;
})();

/**
 * Parses the wallet's coin public key into the raw bytes `ownPublicKey()` yields on-chain.
 * Wallets hand it over as hex; anything else means the check-in status cannot be derived,
 * which is reported as "not checked in" rather than failing the whole state stream.
 */
const coinPublicKeyBytes = (coinPublicKey: string): Uint8Array | undefined => {
  const cleaned = coinPublicKey.replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) return undefined;
  return Uint8Array.from(cleaned.match(/../g)!.map((b) => parseInt(b, 16)));
};

export interface DeployedPrivatePollingAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PrivatePollingDerivedState>;

  createPoll: (question: string, options?: CreatePollOptions) => Promise<TxReceipt>;
  enrollVoter: (commitment: Uint8Array) => Promise<TxReceipt>;
  selfEnroll: () => Promise<TxReceipt>;
  openVoting: () => Promise<TxReceipt>;
  registerTrustee: () => Promise<TxReceipt>;
  closeVoting: () => Promise<TxReceipt>;
  submitDecryptionShare: () => Promise<TxReceipt>;
  castVote: (choice: VoteChoice) => Promise<TxReceipt>;
  publishTally: () => Promise<DecryptedTally & TxReceipt>;
  checkIn: () => Promise<TxReceipt>;
}

export class PrivatePollingAPI implements DeployedPrivatePollingAPI {
  private constructor(
    public readonly deployedContract: DeployedPrivatePollingContract,
    // Retained: `castVote` stages the ballot into private state, and `publishTally`
    // reads the ciphertext back off-chain to decrypt it.
    private readonly providers: PrivatePollingProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    const walletKey = coinPublicKeyBytes(providers.walletProvider.getCoinPublicKey());

    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => PrivatePolling.ledger(contractState.data.state)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                pollState: PollState[ledgerState.pollState],
                ballotCount: ledgerState.ballotCount,
                enrolled: ledgerState.enrolledCommitments.size(),
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(privatePollingPrivateStateKey) as Promise<PrivatePollingPrivateState>),
      ],
      (ledgerState, privateState): PrivatePollingDerivedState => {
        const hashedSecretKey = PrivatePolling.pureCircuits.derivedPublicKey(privateState.secretKey, OWNER_SEQUENCE);
        const commitment = PrivatePolling.pureCircuits.voterCommitment(privateState.secretKey);
        const nullifier = PrivatePolling.pureCircuits.voteNullifier(privateState.secretKey, ledgerState.pollId);

        return {
          pollState: ledgerState.pollState,
          pollQuestion: ledgerState.pollQuestion.is_some ? ledgerState.pollQuestion.value : undefined,
          sequence: ledgerState.sequence,
          isOwner: toHex(ledgerState.owner) === toHex(hashedSecretKey),
          isAdmin: toHex(ledgerState.admin) === toHex(hashedSecretKey),
          openEnrollment: ledgerState.openEnrollment,
          ballotCount: ledgerState.ballotCount,
          tallied: ledgerState.tallied,
          votingDeadline: ledgerState.votingDeadline,
          quorum: ledgerState.quorum,
          quorumMet: ledgerState.quorumMet,
          trusteeCount: ledgerState.trusteeCount,
          shareCount: ledgerState.shareCount,
          isTrustee: ledgerState.trusteeKeys.member(hashedSecretKey),
          hasSubmittedShare: ledgerState.decryptionShares.member(hashedSecretKey),
          finalYes: ledgerState.finalYes,
          finalNo: ledgerState.finalNo,
          finalAbstain: ledgerState.finalAbstain,
          enrolledCount: ledgerState.enrolledCommitments.size(),
          isEligible: ledgerState.enrolledCommitments.member(commitment),
          hasVoted: ledgerState.priorBallotC1.member(nullifier),
          myCommitment: toHex(commitment),
          participantCount: ledgerState.participants.size(),
          hasCheckedIn: walletKey !== undefined && ledgerState.participants.member(walletKey),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PrivatePollingDerivedState>;

  /**
   * Submits one circuit call and returns where it landed.
   *
   * The Compact-generated contract type does not satisfy `callTx`'s circuit-name
   * constraint (see common-types.ts), so the one unavoidable `any` lives here instead of
   * being repeated at every call site.
   */
  private async call(circuit: PrivatePollingCircuitKeys, ...args: unknown[]): Promise<TxReceipt> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const callTx = this.deployedContract.callTx as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const txData = await callTx[circuit](...args);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const receipt: TxReceipt = { txHash: String(txData.public.txHash), blockHeight: Number(txData.public.blockHeight) };
    this.logger?.info({ transactionAdded: { circuit, ...receipt } });
    return receipt;
  }

  /**
   * Starts a poll and opens it for enrollment. Admin-only on-chain.
   *
   * @param options.deadline When voting closes. Enforced on-chain, so the organizer cannot
   *   extend it after seeing how the vote is going. Omit for no deadline.
   * @param options.quorum Minimum ballots for the result to count as binding. A poll that
   *   misses quorum still publishes its numbers — it is flagged, not hidden.
   * @param options.openEnrollment Let any wallet enrol itself. Right for public community
   *   polls; wrong for binding votes, where one person could enrol several keys.
   */
  async createPoll(question: string, options: CreatePollOptions = {}): Promise<TxReceipt> {
    const { deadline, quorum = 0, openEnrollment = false } = options;
    const trimmed = question.trim();
    if (trimmed.length === 0) {
      throw new RangeError('The poll question cannot be empty.');
    }
    if (quorum < 0 || !Number.isInteger(quorum)) {
      throw new RangeError(`Quorum must be a non-negative integer, got ${quorum}.`);
    }
    // The contract compares against block time in seconds; a past deadline would make
    // the poll unvotable, so reject it here rather than after proving.
    const deadlineSeconds = deadline === undefined ? 0n : BigInt(Math.floor(deadline.getTime() / 1000));
    if (deadline !== undefined && deadlineSeconds <= BigInt(Math.floor(Date.now() / 1000))) {
      throw new RangeError('Voting deadline must be in the future.');
    }
    this.logger?.info(`creatingPoll: ${trimmed}`);
    return this.call('createPoll', trimmed, deadlineSeconds, BigInt(quorum), openEnrollment);
  }

  /**
   * Adds a voter commitment to the eligibility roll. Creator-only, and only while the
   * poll is in REGISTRATION — an organizer-gated roll is frozen before voting opens so it
   * cannot be stuffed mid-ballot.
   */
  async enrollVoter(commitment: Uint8Array): Promise<TxReceipt> {
    if (commitment.length !== 32) {
      throw new RangeError(`Voter commitment must be 32 bytes, got ${commitment.length}.`);
    }
    this.logger?.info(`enrollingVoter: ${toHex(commitment)}`);
    return this.call('enrollVoter', commitment);
  }

  /**
   * Enrols this wallet on a poll with open enrollment. The commitment is derived here from
   * the local secret key, so there is nothing for the voter to copy or send anyone.
   */
  async selfEnroll(): Promise<TxReceipt> {
    const privateState = await this.requirePrivateState();
    this.logger?.info('selfEnrolling');
    return this.call('selfEnroll', PrivatePolling.pureCircuits.voterCommitment(privateState.secretKey));
  }

  /**
   * Registers this wallet as a decryption trustee, folding its key into the joint tally
   * key. Open to any wallet during registration: restricting it to the organizer's
   * nominees would put the organizer back in charge of who can decrypt.
   */
  async registerTrustee(): Promise<TxReceipt> {
    this.logger?.info('registeringTrustee');
    return this.call('registerTrustee');
  }

  /**
   * Ends voting so trustees can produce shares. Callable by the creator at any time, or
   * by anyone once the deadline has passed — so a poll cannot be held open indefinitely
   * by an organizer who dislikes where it is heading.
   */
  async closeVoting(): Promise<TxReceipt> {
    this.logger?.info('closingVoting');
    return this.call('closeVoting');
  }

  /**
   * Submits this trustee's decryption share. The circuit recomputes the trustee's public
   * key from the same witness and checks it against what they registered, so a bogus
   * share cannot be accepted.
   */
  async submitDecryptionShare(): Promise<TxReceipt> {
    this.logger?.info('submittingDecryptionShare');
    return this.call('submitDecryptionShare');
  }

  /** Freezes the organizer-gated roll and opens voting. Creator-only. */
  async openVoting(): Promise<TxReceipt> {
    this.logger?.info('openingVoting');
    return this.call('openVoting');
  }

  /**
   * Records this wallet in the contract's participant set. Opt-in, and unconnected to any
   * ballot — it proves the wallet used the product, never how it voted.
   */
  async checkIn(): Promise<TxReceipt> {
    this.logger?.info('checkingIn');
    return this.call('checkIn');
  }

  /**
   * Derives a wallet's enrolment commitment. It is a one-way hash of the secret key, so
   * sharing it does not expose the key or link the eventual ballot back to the voter.
   */
  static voterCommitment(secretKey: Uint8Array): Uint8Array {
    return PrivatePolling.pureCircuits.voterCommitment(secretKey);
  }

  /**
   * Casts a ballot.
   *
   * The choice is staged into private state rather than passed to the circuit, because
   * `castVote` deliberately takes no arguments — a circuit argument would be a public
   * transaction input, which is exactly the disclosure this design removes. The choice
   * reaches the circuit through the `ballotChoice` witness and is never published.
   */
  async castVote(choice: VoteChoice): Promise<TxReceipt> {
    // Validate before proving. The circuit constrains the witness too, but that assert
    // only fires after the proof server has spent minutes building a proof that is then
    // guaranteed to be rejected — so reject it here, immediately and for free.
    if (!isVoteChoice(choice)) {
      throw new RangeError(`Invalid vote choice ${String(choice)} — expected 0 (Yes), 1 (No), or 2 (Abstain).`);
    }
    // Deliberately does not log the choice: a secret ballot should not be written to a
    // local log file either.
    this.logger?.info('castingVote');

    const existing = await this.requirePrivateState();
    await this.providers.privateStateProvider.set(
      privatePollingPrivateStateKey,
      createPrivatePollingPrivateState(existing.secretKey, choice),
    );

    try {
      return await this.call('castVote');
    } finally {
      // Clear the staged choice either way. Leaving it behind would mean a later,
      // unrelated call re-cast the previous ballot — and would leave the choice at rest.
      await this.providers.privateStateProvider.set(
        privatePollingPrivateStateKey,
        createPrivatePollingPrivateState(existing.secretKey),
      );
    }
  }

  /**
   * Decrypts the aggregate and publishes it. Anyone may call this once every trustee has
   * submitted a share.
   *
   * The decryption uses only public data, and the circuit re-encrypts the submitted counts
   * and checks them against the accumulated ciphertext — so this cannot be used to publish
   * a result that does not match the ballots actually cast.
   */
  async publishTally(): Promise<DecryptedTally & TxReceipt> {
    this.logger?.info('publishingTally');

    const contractState = await this.providers.publicDataProvider.queryContractState(this.deployedContractAddress);
    if (contractState === null) {
      throw new Error(`No contract deployed at ${this.deployedContractAddress}`);
    }
    const ledgerState = PrivatePolling.ledger(contractState.data.state);

    if (ledgerState.shareCount !== ledgerState.trusteeCount) {
      throw new Error(
        `Cannot decrypt yet: ${ledgerState.shareCount} of ${ledgerState.trusteeCount} trustees have submitted a share.`,
      );
    }

    // No secret key is used here. Once every share is on-chain the combined value is
    // public, so this search — and therefore the result — is open to anyone.
    const tally = decryptTally(ledgerState.encTallyC2, ledgerState.combinedShares, ledgerState.ballotCount);
    if (tally === null) {
      throw new Error('Could not recover a tally matching the ballots and submitted shares.');
    }

    this.logger?.info(`decryptedTally: yes=${tally.yes} no=${tally.no} abstain=${tally.abstain}`);
    const receipt = await this.call('publishTally', tally.yes, tally.no, tally.abstain);
    return { ...tally, ...receipt };
  }

  private async requirePrivateState(): Promise<PrivatePollingPrivateState> {
    const existing = await this.providers.privateStateProvider.get(privatePollingPrivateStateKey);
    if (existing === null) {
      throw new Error('No private state for this poll — the local secret key is missing.');
    }
    return existing;
  }

  /**
   * Deploys a fresh contract. The deployer's secret key becomes the contract admin, so it
   * must be kept: losing it means no further polls can be started on this contract.
   */
  static async deploy(providers: PrivatePollingProviders, logger?: Logger): Promise<PrivatePollingAPI> {
    logger?.info('deployContract');
    const deployedContract = await deployContract(providers, {
      compiledContract: CompiledPrivatePollingContractContract,
      privateStateId: privatePollingPrivateStateKey,
      initialPrivateState: createPrivatePollingPrivateState(utils.randomBytes(32)),
      args: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see common-types.ts for why
    } as any);

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedContract.deployTxData.public,
      },
    });

    return new PrivatePollingAPI(deployedContract, providers, logger);
  }

  static async join(
    providers: PrivatePollingProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<PrivatePollingAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedContract = await findDeployedContract<PrivatePollingContract>(providers, {
      contractAddress,
      compiledContract: CompiledPrivatePollingContractContract,
      privateStateId: privatePollingPrivateStateKey,
      initialPrivateState: await PrivatePollingAPI.getPrivateState(providers, contractAddress),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see deploy() above.
    } as any);

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedContract.deployTxData.public,
      },
    });

    return new PrivatePollingAPI(deployedContract, providers, logger);
  }

  private static async getPrivateState(
    providers: PrivatePollingProviders,
    contractAddress: ContractAddress,
  ): Promise<PrivatePollingPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(privatePollingPrivateStateKey);
    return existingPrivateState ?? createPrivatePollingPrivateState(utils.randomBytes(32));
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
export * from './tally.js';
