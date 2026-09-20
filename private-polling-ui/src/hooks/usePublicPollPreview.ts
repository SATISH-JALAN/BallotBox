/**
 * Reads a poll's public state straight from the indexer — no wallet required.
 *
 * Lets a visitor see what a shared poll is about (question, stage, turnout, result) before
 * installing or connecting anything. Everything shown here is already public on-chain.
 */

import { useEffect, useState } from 'react';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { ledger, PollState } from '../../../contract/src/managed/private-polling/contract/index.js';
import { NETWORK_ID } from '../config/product';

export type PublicPollPreview = {
  readonly question: string | undefined;
  readonly pollState: PollState;
  readonly openEnrollment: boolean;
  readonly enrolled: bigint;
  readonly ballots: bigint;
  readonly participants: bigint;
  readonly votingDeadline: bigint;
  readonly tallied: boolean;
  readonly finalYes: bigint;
  readonly finalNo: bigint;
  readonly finalAbstain: bigint;
};

const REFRESH_MS = 30_000;

const indexerUrls = () => {
  const network = NETWORK_ID === 'preview' ? 'preview' : 'preprod';
  return {
    query: import.meta.env.VITE_INDEXER_URL || `https://indexer.${network}.midnight.network/api/v4/graphql`,
    ws: import.meta.env.VITE_INDEXER_WS_URL || `wss://indexer.${network}.midnight.network/api/v4/graphql/ws`,
  };
};

export const usePublicPollPreview = (address: string | undefined) => {
  const [preview, setPreview] = useState<PublicPollPreview | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'not-found' | 'error'>('idle');

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const { query, ws } = indexerUrls();
    const provider = indexerPublicDataProvider(query, ws);

    const load = async () => {
      try {
        const contractState = await provider.queryContractState(address);
        if (cancelled) return;
        if (contractState === null) {
          setStatus('not-found');
          return;
        }
        const s = ledger(contractState.data.state);
        setPreview({
          question: s.pollQuestion.is_some ? s.pollQuestion.value : undefined,
          pollState: s.pollState,
          openEnrollment: s.openEnrollment,
          enrolled: s.enrolledCommitments.size(),
          ballots: s.ballotCount,
          participants: s.participants.size(),
          votingDeadline: s.votingDeadline,
          tallied: s.tallied,
          finalYes: s.finalYes,
          finalNo: s.finalNo,
          finalAbstain: s.finalAbstain,
        });
        setStatus('ready');
      } catch {
        // A contract compiled from an older version of this source will not parse with
        // the current ledger layout; treat that like any other unreadable address.
        if (!cancelled) setStatus('error');
      }
    };

    setStatus('loading');
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address]);

  return { preview, status };
};
