// Private Polling CLI — Midnight DApp

import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  PrivatePollingAPI,
  type PrivatePollingDerivedState,
  privatePollingPrivateStateKey,
  type PrivatePollingProviders,
  type DeployedPrivatePollingContract,
  type PrivateStateId,
  isVoteChoice,
  type PrivatePollingCircuitKeys,
} from '../../api/src/index';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, PollState, type Ledger } from '../../contract/src/managed/private-polling/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { randomBytes } from '../../api/src/utils';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils';
import { generateDust } from './generate-dust';
import { PrivatePollingPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export const getPollingLedgerState = async (
  providers: PrivatePollingProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data.state) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new private polling contract
  2. Join an existing private polling contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (
  providers: PrivatePollingProviders,
  rli: Interface,
  logger: Logger,
): Promise<PrivatePollingAPI | null> => {
  let api: PrivatePollingAPI | null = null;

  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        api = await PrivatePollingAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      case '2':
        api = await PrivatePollingAPI.join(
          providers,
          await rli.question('What is the contract address (in hex)? '),
          logger,
        );
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const displayLedgerState = async (
  providers: PrivatePollingProviders,
  deployedContract: DeployedPrivatePollingContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployedContract.deployTxData.public.contractAddress;
  const ledgerState = await getPollingLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`There is no private polling contract deployed at ${contractAddress}`);
  } else {
    const status = pollStatusLabel(ledgerState.pollState);
    const question = !ledgerState.pollQuestion.is_some ? 'none' : ledgerState.pollQuestion.value;
    logger.info(`Current poll status: '${status}'`);
    logger.info(`Poll question: '${question}'`);
    logger.info(`Ballots cast: ${ledgerState.ballotCount}`);
    if (ledgerState.tallied) {
      logger.info(
        `Final tally: Yes = ${ledgerState.finalYes}, No = ${ledgerState.finalNo}, Abstain = ${ledgerState.finalAbstain}`,
      );
    } else {
      logger.info('Tally: encrypted — individual choices are not readable until published');
    }
    logger.info(`Enrolled voters: ${ledgerState.eligibility.firstFree()}`);
    logger.info(`Current owner is: '${toHex(ledgerState.owner)}'`);
  }
};

const displayPrivateState = async (providers: PrivatePollingProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(privatePollingPrivateStateKey);
  if (privateState === null) {
    logger.info(`There is no existing private polling private state`);
  } else {
    logger.info(`Current voter secret key is: ${toHex(privateState.secretKey)}`);
  }
};

/**
 * Parses an enrollment commitment. Rejects anything that isn't exactly 32 bytes of hex,
 * so a typo fails here rather than after several minutes of proof generation.
 */
const parseCommitment = (value: string): Uint8Array | null => {
  const cleaned = value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) return null;
  return Uint8Array.from(cleaned.match(/../g)!.map((byte) => parseInt(byte, 16)));
};

/**
 * Prints this node's enrollment commitment — a one-way hash of the local secret key.
 * The voter hands this to the organizer to be added to the roll; it exposes neither the
 * key nor any link to the ballot they will later cast.
 */
const displayVoterCommitment = async (providers: PrivatePollingProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(privatePollingPrivateStateKey);
  if (privateState === null) {
    logger.info('There is no existing private polling private state');
    return;
  }
  logger.info(`Your voter commitment is: ${toHex(PrivatePollingAPI.voterCommitment(privateState.secretKey))}`);
  logger.info('Give this to the poll organizer so they can enroll you.');
};

const displayDerivedState = (state: PrivatePollingDerivedState | undefined, logger: Logger) => {
  if (state === undefined) {
    logger.info(`No polling state currently available`);
  } else {
    const status = pollStatusLabel(state.pollState);
    logger.info(`Current poll status: '${status}'`);
    logger.info(`Poll question: '${state.pollQuestion ?? 'none'}'`);
    logger.info(`Ballots cast: ${state.ballotCount}`);
    if (state.tallied) {
      logger.info(`Final tally: Yes = ${state.finalYes}, No = ${state.finalNo}, Abstain = ${state.finalAbstain}`);
    } else {
      logger.info('Tally: encrypted — not readable until the creator publishes it');
    }
    logger.info(`Am I the poll creator?: '${state.isOwner ? 'YES' : 'NO'}'`);
    logger.info(`Enrolled voters: ${state.enrolledCount}`);
    logger.info(
      `Voting deadline: ${state.votingDeadline === 0n ? 'none' : new Date(Number(state.votingDeadline) * 1000).toISOString()}`,
    );
    if (state.quorum > 0n) {
      logger.info(`Quorum: ${state.quorum} ballots${state.tallied ? (state.quorumMet ? ' — MET' : ' — NOT MET') : ''}`);
    }
    logger.info(`Am I eligible to vote?: '${state.isEligible ? 'YES' : 'NO'}'`);
    logger.info(`Have I already voted?: '${state.hasVoted ? 'YES' : 'NO'}'`);
    logger.info(`Decryption shares: ${state.shareCount} of ${state.trusteeCount} trustees`);
    logger.info(`Am I a trustee?: '${state.isTrustee ? 'YES' : 'NO'}'`);
    if (state.isTrustee) {
      logger.info(`Have I submitted my share?: '${state.hasSubmittedShare ? 'YES' : 'NO'}'`);
    }
  }
};

/** One label per lifecycle state — the poll is no longer just open or closed. */
const pollStatusLabel = (s: PollState): string => {
  if (s === PollState.OPEN) return 'OPEN';
  if (s === PollState.REGISTRATION) return 'REGISTRATION';
  if (s === PollState.TALLYING) return 'TALLYING';
  return 'CLOSED';
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Create a new poll (opens enrollment)
  2. Enroll a voter commitment (Creator only, during enrollment)
  3. Open voting — freezes the roll and trustee set (Creator only)
  4. Cast a vote (0 = Yes, 1 = No, 2 = Abstain)
  5. Publish the tally (anyone, once every trustee has submitted a share)
  6. Show my voter commitment (give this to the organizer to be enrolled)
  7. Display current ledger state (known by everyone)
  8. Display private secret key (known only to this node)
  9. Display derived poll state
  10. Register as a decryption trustee (before voting opens)
  11. Close voting, so trustees can submit shares
  12. Submit my decryption share (trustees only)
  13. Exit
Which would you like to do? `;

const mainLoop = async (providers: PrivatePollingProviders, rli: Interface, logger: Logger): Promise<void> => {
  const pollingApi = await deployOrJoin(providers, rli, logger);
  if (pollingApi === null) {
    return;
  }
  let currentState: PrivatePollingDerivedState | undefined;
  const stateObserver = {
    next: (state: PrivatePollingDerivedState) => (currentState = state),
  };
  const subscription = pollingApi.state$.subscribe(stateObserver);
  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const question = await rli.question(`Enter the poll question: `);
            const hours = await rli.question('Voting window in hours (blank = no deadline): ');
            const quorumStr = await rli.question('Minimum ballots for a binding result (blank = none): ');
            const deadline = hours.trim() ? new Date(Date.now() + Number(hours) * 3600_000) : undefined;
            if (hours.trim() && (!Number.isFinite(Number(hours)) || Number(hours) <= 0)) {
              logger.error('Voting window must be a positive number of hours.');
              break;
            }
            const quorum = quorumStr.trim() ? Number(quorumStr) : 0;
            if (!Number.isInteger(quorum) || quorum < 0) {
              logger.error('Quorum must be a non-negative whole number.');
              break;
            }
            await pollingApi.createPoll(question, deadline, quorum);
            break;
          }
          case '2': {
            const hexCommitment = await rli.question('Voter commitment (64 hex chars): ');
            const bytes = parseCommitment(hexCommitment);
            if (bytes === null) {
              logger.error('Invalid commitment — expected exactly 64 hex characters.');
            } else {
              await pollingApi.enrollVoter(bytes);
            }
            break;
          }
          case '3':
            await pollingApi.openVoting();
            break;
          case '4': {
            const voteStr = await rli.question(`Vote choice (0 = Yes, 1 = No, 2 = Abstain): `);
            const vote = parseInt(voteStr, 10);
            // `isVoteChoice` narrows `number` to `VoteChoice`, so the range check and the
            // type are guaranteed to agree — they can't drift apart the way a hand-rolled
            // `vote < 0 || vote > 2` alongside a separate cast eventually would.
            if (!isVoteChoice(vote)) {
              logger.error('Invalid vote choice. Must be 0, 1, or 2.');
            } else {
              await pollingApi.castVote(vote);
            }
            break;
          }
          case '5': {
            const tally = await pollingApi.publishTally();
            logger.info(`Published: Yes = ${tally.yes}, No = ${tally.no}, Abstain = ${tally.abstain}`);
            break;
          }
          case '6':
            await displayVoterCommitment(providers, logger);
            break;
          case '7':
            await displayLedgerState(providers, pollingApi.deployedContract, logger);
            break;
          case '8':
            await displayPrivateState(providers, logger);
            break;
          case '9':
            displayDerivedState(currentState, logger);
            break;
          case '10':
            await pollingApi.registerTrustee();
            break;
          case '11':
            await pollingApi.closeVoting();
            break;
          case '12':
            await pollingApi.submitDecryptionShare();
            break;
          case '13':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started with configuration: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw] ?? 1000n;
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<PrivatePollingCircuitKeys>(config.zkConfigPath);
    const providers: PrivatePollingProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, PrivatePollingPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'Polling-Test-2026!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
