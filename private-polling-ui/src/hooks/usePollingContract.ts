/**
 * usePollingContract
 *
 * The single place the frontend talks to the contract. Every circuit call goes through
 * `run`, which gives all of them the same loading, error and receipt handling — so a new
 * action cannot forget to clear its spinner or swallow its error.
 *
 * Circuit calls (each a ZK-proven transaction):
 *   createPoll · enrollVoter · selfEnroll · registerTrustee · openVoting · castVote
 *   closeVoting · submitDecryptionShare · publishTally · checkIn
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Observable } from 'rxjs';
import {
  type DeployedPrivatePollingAPI,
  type PrivatePollingDerivedState,
  type TxReceipt,
  type VoteChoice,
  VOTE_CHOICE_LABELS,
} from '../../../api/src/index';
import { type BoardDeployment } from '../contexts';
import { friendlyError } from '../lib/friendly-errors';
import { parseCommitments } from '../lib/commitments';

export type ContractAction =
  | 'createPoll'
  | 'enrollVoter'
  | 'selfEnroll'
  | 'openVoting'
  | 'registerTrustee'
  | 'closeVoting'
  | 'submitShare'
  | 'castVote'
  | 'publishTally'
  | 'checkIn'
  | 'deploy';

/** A confirmed transaction, labelled for the success notice. */
export type ActionReceipt = TxReceipt & { readonly action: ContractAction; readonly label: string };

export type BatchProgress = { readonly done: number; readonly total: number; readonly failed: number };

export type CreatePollInput = {
  readonly question: string;
  readonly deadlineHours?: number;
  readonly quorum?: number;
  readonly openEnrollment?: boolean;
};

export interface UsePollingContractResult {
  readonly pollState: PrivatePollingDerivedState | null;
  readonly contractAddress: ContractAddress | null;
  readonly isLoading: boolean;
  readonly currentAction: ContractAction | null;
  readonly loadingMessage: string;
  /** Seconds since the current action started — proofs are slow, so show that time passes. */
  readonly elapsedSeconds: number;
  readonly error: string | null;
  readonly lastReceipt: ActionReceipt | null;
  readonly batchProgress: BatchProgress | null;

  createPoll: (input: CreatePollInput) => Promise<boolean>;
  castVote: (choice: VoteChoice) => Promise<boolean>;
  /** Enrols one commitment, or many separated by whitespace/commas/newlines. */
  enrollVoters: (commitmentsText: string) => Promise<boolean>;
  selfEnroll: () => Promise<boolean>;
  openVoting: () => Promise<boolean>;
  registerTrustee: () => Promise<boolean>;
  closeVoting: () => Promise<boolean>;
  submitDecryptionShare: () => Promise<boolean>;
  publishTally: () => Promise<boolean>;
  checkIn: () => Promise<boolean>;
  clearError: () => void;
  clearReceipt: () => void;
}

const SUCCESS_LABELS: Record<ContractAction, string> = {
  createPoll: 'Poll created — enrollment is open',
  enrollVoter: 'Voter enrolled',
  selfEnroll: 'You are enrolled in this poll',
  openVoting: 'Voting is open',
  registerTrustee: 'You are now a decryption trustee',
  closeVoting: 'Voting closed — trustees can decrypt',
  submitShare: 'Decryption share submitted',
  castVote: 'Your encrypted ballot is recorded',
  publishTally: 'Result published and verified on-chain',
  checkIn: 'Checked in — thanks for testing BallotBox!',
  deploy: 'Contract deployed',
};

const loadingMessageFor = (action: ContractAction | null, choice: VoteChoice | null, batch: BatchProgress | null) => {
  switch (action) {
    case 'castVote':
      return `Encrypting and proving your ${choice !== null ? VOTE_CHOICE_LABELS[choice] : ''} ballot…`;
    case 'createPoll':
      return 'Proving and submitting the new poll…';
    case 'enrollVoter':
      return batch && batch.total > 1
        ? `Enrolling voters… ${batch.done} of ${batch.total}`
        : 'Adding the voter to the eligibility roll…';
    case 'selfEnroll':
      return 'Adding your commitment to the voter roll…';
    case 'openVoting':
      return 'Opening voting…';
    case 'registerTrustee':
      return 'Registering you as a decryption trustee…';
    case 'closeVoting':
      return 'Closing voting so trustees can decrypt…';
    case 'submitShare':
      return 'Proving and submitting your decryption share…';
    case 'publishTally':
      return 'Decrypting the tally and proving it matches the ballots…';
    case 'checkIn':
      return 'Recording your check-in…';
    case 'deploy':
      return 'Connecting to your wallet and loading the poll…';
    default:
      return 'Working…';
  }
};

export function usePollingContract(
  boardDeployment$: Observable<BoardDeployment> | undefined,
): UsePollingContractResult {
  const [api, setApi] = useState<DeployedPrivatePollingAPI | null>(null);
  const [pollState, setPollState] = useState<PrivatePollingDerivedState | null>(null);
  const [contractAddress, setContractAddress] = useState<ContractAddress | null>(null);
  const [currentAction, setCurrentAction] = useState<ContractAction | null>(boardDeployment$ ? 'deploy' : null);
  const [voteChoice, setVoteChoice] = useState<VoteChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ActionReceipt | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    if (currentAction === null) return;
    setElapsedSeconds(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - started) / 1000)), 1_000);
    return () => clearInterval(timer);
  }, [currentAction]);

  useEffect(() => {
    if (!boardDeployment$) return;
    let stateSubscription: { unsubscribe: () => void } | undefined;

    const deploymentSubscription = boardDeployment$.subscribe((deployment) => {
      if (deployment.status === 'in-progress') {
        setCurrentAction('deploy');
        return;
      }
      setCurrentAction(null);
      if (deployment.status === 'failed') {
        setError(friendlyError(deployment.error));
        return;
      }
      setApi(deployment.api);
      setContractAddress(deployment.api.deployedContractAddress);
      stateSubscription?.unsubscribe();
      stateSubscription = deployment.api.state$.subscribe({
        next: setPollState,
        error: (e: unknown) => setError(friendlyError(e)),
      });
    });

    return () => {
      stateSubscription?.unsubscribe();
      deploymentSubscription.unsubscribe();
    };
  }, [boardDeployment$]);

  /** Runs one action with shared busy/error/receipt handling. Resolves true on success. */
  const run = useCallback(
    async (action: ContractAction, call: (a: DeployedPrivatePollingAPI) => Promise<TxReceipt>): Promise<boolean> => {
      if (!api || busy.current) return false;
      busy.current = true;
      setCurrentAction(action);
      setError(null);
      try {
        const receipt = await call(api);
        setLastReceipt({ ...receipt, action, label: SUCCESS_LABELS[action] });
        return true;
      } catch (e) {
        setError(friendlyError(e));
        return false;
      } finally {
        busy.current = false;
        setCurrentAction(null);
      }
    },
    [api],
  );

  const createPoll = useCallback(
    ({ question, deadlineHours = 0, quorum = 0, openEnrollment = false }: CreatePollInput) =>
      run('createPoll', (a) =>
        a.createPoll(question, {
          deadline: deadlineHours > 0 ? new Date(Date.now() + deadlineHours * 3_600_000) : undefined,
          quorum,
          openEnrollment,
        }),
      ),
    [run],
  );

  const castVote = useCallback(
    async (choice: VoteChoice) => {
      setVoteChoice(choice);
      try {
        return await run('castVote', (a) => a.castVote(choice));
      } finally {
        setVoteChoice(null);
      }
    },
    [run],
  );

  const enrollVoters = useCallback(
    async (commitmentsText: string): Promise<boolean> => {
      if (!api || busy.current) return false;
      const { valid, invalid } = parseCommitments(commitmentsText);
      if (invalid.length > 0) {
        setError(`Not a valid commitment (expected 64 hex characters): ${invalid.slice(0, 3).join(', ')}`);
        return false;
      }
      if (valid.length === 0) {
        setError('Paste at least one voter commitment.');
        return false;
      }

      // One transaction per commitment, in order. A failure is recorded and the batch
      // continues, so one duplicate in a pasted list does not strand everyone after it.
      busy.current = true;
      setCurrentAction('enrollVoter');
      setError(null);
      let failed = 0;
      let lastError: unknown;
      let receipt: TxReceipt | null = null;
      try {
        for (let i = 0; i < valid.length; i++) {
          setBatchProgress({ done: i, total: valid.length, failed });
          try {
            receipt = await api.enrollVoter(valid[i]);
          } catch (e) {
            failed++;
            lastError = e;
          }
        }
        if (receipt) {
          const enrolled = valid.length - failed;
          setLastReceipt({
            ...receipt,
            action: 'enrollVoter',
            label: enrolled === 1 ? 'Voter enrolled' : `${enrolled} voters enrolled`,
          });
        }
        if (failed > 0) {
          setError(`${failed} of ${valid.length} enrollments failed. Last error: ${friendlyError(lastError)}`);
        }
        return failed === 0;
      } finally {
        busy.current = false;
        setBatchProgress(null);
        setCurrentAction(null);
      }
    },
    [api],
  );

  const selfEnroll = useCallback(() => run('selfEnroll', (a) => a.selfEnroll()), [run]);
  const openVoting = useCallback(() => run('openVoting', (a) => a.openVoting()), [run]);
  const registerTrustee = useCallback(() => run('registerTrustee', (a) => a.registerTrustee()), [run]);
  const closeVoting = useCallback(() => run('closeVoting', (a) => a.closeVoting()), [run]);
  const submitDecryptionShare = useCallback(() => run('submitShare', (a) => a.submitDecryptionShare()), [run]);
  const publishTally = useCallback(() => run('publishTally', (a) => a.publishTally()), [run]);
  const checkIn = useCallback(() => run('checkIn', (a) => a.checkIn()), [run]);
  const clearError = useCallback(() => setError(null), []);
  const clearReceipt = useCallback(() => setLastReceipt(null), []);

  return {
    pollState,
    contractAddress,
    isLoading: currentAction !== null,
    currentAction,
    loadingMessage: loadingMessageFor(currentAction, voteChoice, batchProgress),
    elapsedSeconds,
    error,
    lastReceipt,
    batchProgress,
    createPoll,
    castVote,
    enrollVoters,
    selfEnroll,
    openVoting,
    registerTrustee,
    closeVoting,
    submitDecryptionShare,
    publishTally,
    checkIn,
    clearError,
    clearReceipt,
  };
}
