/**
 * usePollingContract
 *
 * Custom React hook that exposes all smart contract interactions for the
 * Private Polling dApp. This is the single source of truth for every
 * circuit call made from the frontend.
 *
 * Circuit calls (ZK-proven on-chain transactions):
 *   - createPoll(question)  → calls the `createPoll` Compact circuit
 *   - castVote(choice)      → calls the `castVote` Compact circuit (VoteChoice.Yes/No/Abstain)
 *   - closePoll()           → calls the `closePoll` Compact circuit (creator only)
 *
 * The hook manages:
 *   - Deploying a new poll contract
 *   - Joining an existing poll contract by address
 *   - Subscribing to live poll state via the indexer observable
 *   - Exposing loading and error states to the UI
 */

import { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Observable } from 'rxjs';
import {
  type DeployedPrivatePollingAPI,
  type PrivatePollingDerivedState,
  type VoteChoice,
  VOTE_CHOICE_LABELS,
} from '../../../api/src/index';
import { type BoardDeployment } from '../contexts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContractAction =
  | 'createPoll'
  | 'enrollVoter'
  | 'openVoting'
  | 'registerTrustee'
  | 'closeVoting'
  | 'submitShare'
  | 'castVote'
  | 'publishTally'
  | 'deploy'
  | 'join'
  | null;

/** Errors auto-dismiss after this long, so a stale banner never blocks the UI. */
const ERROR_AUTO_DISMISS_MS = 5_000;

export interface UsePollingContractResult {
  /** Current derived state from the on-chain ledger */
  pollState: PrivatePollingDerivedState | null;

  /** The deployed contract address, if available */
  contractAddress: ContractAddress | null;

  /** Whether any contract action is in progress */
  isLoading: boolean;

  /** The current action being performed, for granular UI feedback */
  currentAction: ContractAction;

  /** Human-readable status for whatever `currentAction` is in flight */
  loadingMessage: string;

  /** Last error message, if any */
  error: string | null;

  /**
   * Creates a new poll with the given question.
   * Calls the `createPoll` Compact circuit.
   * @param question - The poll question text
   */
  /**
   * @param deadlineHours Voting window in hours. Enforced on-chain, so it cannot be
   *   extended after the fact. Omit or 0 for no deadline.
   * @param quorum Minimum ballots for a binding result. 0 for none.
   */
  createPoll: (question: string, deadlineHours?: number, quorum?: number) => Promise<void>;

  /**
   * Casts a vote on the current open poll.
   * Calls the `castVote` Compact circuit.
   * @param choice - 0 = Yes, 1 = No, 2 = Abstain
   */
  castVote: (choice: VoteChoice) => Promise<void>;

  /** Adds a voter commitment to the eligibility roll. Creator-only, during registration. */
  enrollVoter: (commitmentHex: string) => Promise<void>;

  /** Freezes the roll and opens voting. Creator-only. */
  openVoting: () => Promise<void>;

  /** Registers this wallet as a decryption trustee. Open to anyone before voting opens. */
  registerTrustee: () => Promise<void>;

  /** Ends voting so trustees can submit shares. */
  closeVoting: () => Promise<void>;

  /** Submits this trustee's decryption share. */
  submitDecryptionShare: () => Promise<void>;

  /**
   * Decrypts the encrypted aggregate and publishes it, closing the poll (creator only).
   * Calls the `publishTally` Compact circuit, which re-encrypts the submitted counts and
   * checks them against the ballots — so a wrong tally cannot be published.
   */
  publishTally: () => Promise<void>;

  /** Clears the current error message */
  clearError: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param boardDeployment$ - Observable stream of the board deployment status.
 *   Provided by `BrowserDeployedBoardManager` via the `DeployedBoardContext`.
 *   Pass `undefined` for the "not yet deployed" empty state card.
 */
export function usePollingContract(
  boardDeployment$: Observable<BoardDeployment> | undefined,
): UsePollingContractResult {
  const [api, setApi] = useState<DeployedPrivatePollingAPI | null>(null);
  const [pollState, setPollState] = useState<PrivatePollingDerivedState | null>(null);
  const [contractAddress, setContractAddress] = useState<ContractAddress | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!boardDeployment$);
  const [currentAction, setCurrentAction] = useState<ContractAction>(null);
  const [voteChoice, setVoteChoice] = useState<VoteChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss errors so a stale banner never blocks the UI indefinitely
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), ERROR_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error]);

  // Subscribe to deployment observable
  useEffect(() => {
    if (!boardDeployment$) return;

    const sub = boardDeployment$.subscribe((deployment) => {
      if (deployment.status === 'in-progress') {
        setIsLoading(true);
        setCurrentAction('deploy');
        return;
      }

      setIsLoading(false);
      setCurrentAction(null);

      if (deployment.status === 'failed') {
        setError(
          deployment.error.message.length
            ? deployment.error.message
            : 'Encountered an unexpected error during deployment.',
        );
        return;
      }

      // Deployment succeeded
      const deployedApi = deployment.api;
      setApi(deployedApi);
      setContractAddress(deployedApi.deployedContractAddress);

      // Subscribe to live on-chain state
      const stateSub = deployedApi.state$.subscribe(setPollState);
      return () => stateSub.unsubscribe();
    });

    return () => sub.unsubscribe();
  }, [boardDeployment$]);

  // ── Circuit calls ──────────────────────────────────────────────────────────

  /**
   * createPoll — calls the `createPoll` Compact circuit.
   * Creates a new poll with the given question on the deployed contract.
   */
  const createPoll = useCallback(
    async (question: string, deadlineHours = 0, quorum = 0): Promise<void> => {
      if (!api || !question.trim()) return;
      setIsLoading(true);
      setCurrentAction('createPoll');
      setError(null);
      try {
        const deadline = deadlineHours > 0 ? new Date(Date.now() + deadlineHours * 3600_000) : undefined;
        await api.createPoll(question.trim(), deadline, quorum);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        setCurrentAction(null);
      }
    },
    [api],
  );

  /**
   * castVote — calls the `castVote` Compact circuit.
   * Casts a vote: VoteChoice.Yes / No / Abstain.
   * NOTE: the choice is currently disclosed on-chain by the circuit — see PRIVACY.md.
   */
  const castVote = useCallback(
    async (choice: VoteChoice): Promise<void> => {
      if (!api) return;
      setIsLoading(true);
      setCurrentAction('castVote');
      setVoteChoice(choice);
      setError(null);
      try {
        await api.castVote(choice);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        setCurrentAction(null);
        setVoteChoice(null);
      }
    },
    [api],
  );

  /**
   * publishTally — calls the `publishTally` Compact circuit.
   * Creator-only; decryption happens locally and the circuit verifies it.
   */
  const publishTally = useCallback(async (): Promise<void> => {
    if (!api) return;
    setIsLoading(true);
    setCurrentAction('publishTally');
    setError(null);
    try {
      await api.publishTally();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  }, [api]);

  /**
   * enrollVoter — calls the `enrollVoter` Compact circuit.
   * Takes the 64-hex-character commitment a voter derived from their own secret key.
   */
  const enrollVoter = useCallback(
    async (commitmentHex: string): Promise<void> => {
      if (!api) return;
      const cleaned = commitmentHex.trim().replace(/^0x/i, '');
      // Reject a malformed commitment here — the circuit would only reject it after
      // minutes of proof generation.
      if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
        setError('Invalid commitment — expected exactly 64 hex characters.');
        return;
      }
      setIsLoading(true);
      setCurrentAction('enrollVoter');
      setError(null);
      try {
        const bytes = Uint8Array.from(cleaned.match(/../g)!.map((b) => parseInt(b, 16)));
        await api.enrollVoter(bytes);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        setCurrentAction(null);
      }
    },
    [api],
  );

  /** openVoting — calls the `openVoting` Compact circuit. Creator-only. */
  const openVoting = useCallback(async (): Promise<void> => {
    if (!api) return;
    setIsLoading(true);
    setCurrentAction('openVoting');
    setError(null);
    try {
      await api.openVoting();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setCurrentAction(null);
    }
  }, [api]);

  /** Wraps a no-argument circuit call in the shared loading / error handling. */
  const runAction = useCallback(
    (action: ContractAction, call: (a: DeployedPrivatePollingAPI) => Promise<unknown>) => async (): Promise<void> => {
      if (!api) return;
      setIsLoading(true);
      setCurrentAction(action);
      setError(null);
      try {
        await call(api);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
        setCurrentAction(null);
      }
    },
    [api],
  );

  const registerTrustee = useCallback(
    runAction('registerTrustee', (a) => a.registerTrustee()),
    [runAction],
  );
  const closeVoting = useCallback(
    runAction('closeVoting', (a) => a.closeVoting()),
    [runAction],
  );
  const submitDecryptionShare = useCallback(
    runAction('submitShare', (a) => a.submitDecryptionShare()),
    [runAction],
  );

  const clearError = useCallback(() => setError(null), []);

  // ── Loading message ───────────────────────────────────────────────────────
  // One specific, human-readable status per circuit call, so the UI never
  // shows a bare spinner with no indication of what's actually happening.
  let loadingMessage = 'Working…';
  switch (currentAction) {
    case 'castVote':
      loadingMessage = `Generating ZK proof for your ${voteChoice !== null ? VOTE_CHOICE_LABELS[voteChoice] : ''} vote…`;
      break;
    case 'createPoll':
      loadingMessage = 'Encrypting and submitting your poll to the chain…';
      break;
    case 'enrollVoter':
      loadingMessage = 'Adding voter to the eligibility roll…';
      break;
    case 'openVoting':
      loadingMessage = 'Freezing the roll and opening voting…';
      break;
    case 'registerTrustee':
      loadingMessage = 'Registering as a decryption trustee…';
      break;
    case 'closeVoting':
      loadingMessage = 'Closing voting so trustees can decrypt…';
      break;
    case 'submitShare':
      loadingMessage = 'Proving and submitting your decryption share…';
      break;
    case 'publishTally':
      loadingMessage = 'Decrypting the tally and proving it matches the ballots…';
      break;
    case 'deploy':
      loadingMessage = 'Deploying contract to Midnight preprod…';
      break;
    case 'join':
      loadingMessage = 'Connecting to existing poll contract…';
      break;
  }

  return {
    pollState,
    contractAddress,
    isLoading,
    currentAction,
    loadingMessage,
    error,
    createPoll,
    castVote,
    publishTally,
    enrollVoter,
    openVoting,
    registerTrustee,
    closeVoting,
    submitDecryptionShare,
    clearError,
  };
}
