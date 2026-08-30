import * as PrivatePolling from '../../contract/src/managed/private-polling/contract/index.js';

import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type PrivatePollingDerivedState,
  type PrivatePollingContract,
  type PrivatePollingProviders,
  type DeployedPrivatePollingContract,
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
 * The sequence bytes the contract actually derives `owner` from.
 *
 * `createPoll` computes `derivedPublicKey(sk, pad(32, "0"))`, and Compact's `pad` emits
 * the ASCII bytes of the string `"0"` zero-padded to 32 — that is `[0x30, 0x00 × 31]`,
 * not the `sequence` counter and not 32 zero bytes. Deriving from `sequence` here made
 * `isOwner` permanently false, so the creator never saw their own controls.
 */
const OWNER_SEQUENCE = ((): Uint8Array => {
  const bytes = new Uint8Array(32);
  bytes[0] = 0x30; // '0'
  return bytes;
})();

export interface DeployedPrivatePollingAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PrivatePollingDerivedState>;

  createPoll: (question: string, deadline?: Date, quorum?: number) => Promise<void>;
  enrollVoter: (commitment: Uint8Array) => Promise<void>;
  openVoting: () => Promise<void>;
  registerTrustee: () => Promise<void>;
  closeVoting: () => Promise<void>;
  submitDecryptionShare: () => Promise<void>;
  castVote: (choice: VoteChoice) => Promise<void>;
  publishTally: () => Promise<DecryptedTally>;
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
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => PrivatePolling.ledger(contractState.data.state)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  ...ledgerState,
                  pollState: PollState[ledgerState.pollState],
                  owner: toHex(ledgerState.owner),
                },
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get(privatePollingPrivateStateKey) as Promise<PrivatePollingPrivateState>),
      ],
      (ledgerState, privateState) => {
        const hashedSecretKey = PrivatePolling.pureCircuits.derivedPublicKey(privateState.secretKey, OWNER_SEQUENCE);
        const commitment = PrivatePolling.pureCircuits.voterCommitment(privateState.secretKey);
        const nullifier = PrivatePolling.pureCircuits.voteNullifier(privateState.secretKey, ledgerState.pollId);

        return {
          pollState: ledgerState.pollState,
          pollQuestion: ledgerState.pollQuestion.value,
          sequence: ledgerState.sequence,
          isOwner: toHex(ledgerState.owner) === toHex(hashedSecretKey),
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
          enrolledCount: ledgerState.eligibility.firstFree(),
          isEligible: ledgerState.eligibility.findPathForLeaf(commitment) !== undefined,
          hasVoted: ledgerState.priorBallotC1.member(nullifier),
          myCommitment: toHex(commitment),
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PrivatePollingDerivedState>;

  /**
   * Opens a poll for enrollment.
   *
   * @param deadline When voting closes. Enforced on-chain, so the organizer cannot
   *   extend it after seeing how the vote is going. Omit for no deadline.
   * @param quorum Minimum ballots for the result to count as binding. A poll that misses
   *   quorum still publishes its numbers — it is flagged, not hidden.
   */
  async createPoll(question: string, deadline?: Date, quorum = 0): Promise<void> {
    if (quorum < 0 || !Number.isInteger(quorum)) {
      throw new RangeError(`Quorum must be a non-negative integer, got ${quorum}.`);
    }
    // The contract compares against block time in seconds; a past deadline would make
    // the poll unvotable, so reject it here rather than after deployment.
    const deadlineSeconds = deadline === undefined ? 0n : BigInt(Math.floor(deadline.getTime() / 1000));
    if (deadline !== undefined && deadlineSeconds <= BigInt(Math.floor(Date.now() / 1000))) {
      throw new RangeError('Voting deadline must be in the future.');
    }
    this.logger?.info(`creatingPoll: ${question}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- callTx's circuit names need `provableCircuits`
    const txData = await (this.deployedContract.callTx as any).createPoll(question, deadlineSeconds, BigInt(quorum));
    this.logger?.trace({
      transactionAdded: {
        circuit: 'createPoll',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Adds a voter commitment to the eligibility roll. Creator-only, and only while the
   * poll is in REGISTRATION — the roll is frozen before voting opens so it cannot be
   * stuffed mid-ballot.
   */
  async enrollVoter(commitment: Uint8Array): Promise<void> {
    if (commitment.length !== 32) {
      throw new RangeError(`Voter commitment must be 32 bytes, got ${commitment.length}.`);
    }
    this.logger?.info(`enrollingVoter: ${toHex(commitment)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).enrollVoter(commitment);
    this.logger?.trace({
      transactionAdded: { circuit: 'enrollVoter', txHash: txData.public.txHash },
    });
  }

  /**
   * Registers this wallet as a decryption trustee, folding its key into the joint tally
   * key. Open to any wallet during registration: restricting it to the organizer's
   * nominees would put the organizer back in charge of who can decrypt.
   */
  async registerTrustee(): Promise<void> {
    this.logger?.info('registeringTrustee');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).registerTrustee();
    this.logger?.trace({
      transactionAdded: { circuit: 'registerTrustee', txHash: txData.public.txHash },
    });
  }

  /**
   * Ends voting so trustees can produce shares. Callable by the creator at any time, or
   * by anyone once the deadline has passed — so a poll cannot be held open indefinitely
   * by an organizer who dislikes where it is heading.
   */
  async closeVoting(): Promise<void> {
    this.logger?.info('closingVoting');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).closeVoting();
    this.logger?.trace({
      transactionAdded: { circuit: 'closeVoting', txHash: txData.public.txHash },
    });
  }

  /**
   * Submits this trustee's decryption share. The circuit recomputes the trustee's public
   * key from the same witness and checks it against what they registered, so a bogus
   * share cannot be accepted.
   */
  async submitDecryptionShare(): Promise<void> {
    this.logger?.info('submittingDecryptionShare');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).submitDecryptionShare();
    this.logger?.trace({
      transactionAdded: { circuit: 'submitDecryptionShare', txHash: txData.public.txHash },
    });
  }

  /** Freezes the eligibility roll and opens voting. Creator-only. */
  async openVoting(): Promise<void> {
    this.logger?.info('openingVoting');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).openVoting();
    this.logger?.trace({
      transactionAdded: { circuit: 'openVoting', txHash: txData.public.txHash },
    });
  }

  /**
   * Derives this wallet's enrollment commitment, to hand to the poll organizer
   * out-of-band. It is a one-way hash of the secret key, so sharing it does not expose
   * the key or link the eventual ballot back to the voter.
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
  async castVote(choice: VoteChoice): Promise<void> {
    // Validate before proving. The circuit constrains the witness too, but that assert
    // only fires after the proof server has spent minutes building a proof that is then
    // guaranteed to be rejected — so reject it here, immediately and for free.
    if (!isVoteChoice(choice)) {
      throw new RangeError(`Invalid vote choice ${String(choice)} — expected 0 (Yes), 1 (No), or 2 (Abstain).`);
    }
    // Deliberately does not log the choice: a secret ballot should not be written to a
    // local log file either.
    this.logger?.info('castingVote');

    const existing = await this.providers.privateStateProvider.get(privatePollingPrivateStateKey);
    if (existing === null) {
      throw new Error('No private state — cannot derive a ballot without a secret key.');
    }
    await this.providers.privateStateProvider.set(
      privatePollingPrivateStateKey,
      createPrivatePollingPrivateState(existing.secretKey, choice),
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
      const txData = await (this.deployedContract.callTx as any).castVote();
      this.logger?.trace({
        transactionAdded: { circuit: 'castVote', txHash: txData.public.txHash },
      });
    } finally {
      // Clear the staged choice either way. Leaving it behind would mean a later,
      // unrelated call re-cast the previous ballot.
      await this.providers.privateStateProvider.set(
        privatePollingPrivateStateKey,
        createPrivatePollingPrivateState(existing.secretKey),
      );
    }
  }

  /**
   * Decrypts the aggregate and publishes it. Creator-only.
   *
   * The decryption happens locally, and the circuit then re-encrypts the submitted
   * counts and checks them against the accumulated ciphertext — so this cannot be used
   * to publish a result that does not match the ballots actually cast.
   */
  async publishTally(): Promise<DecryptedTally> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see createPoll() above.
    const txData = await (this.deployedContract.callTx as any).publishTally(tally.yes, tally.no, tally.abstain);
    this.logger?.trace({
      transactionAdded: { circuit: 'publishTally', txHash: txData.public.txHash },
    });
    return tally;
  }

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
