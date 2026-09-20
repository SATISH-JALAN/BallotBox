import React from 'react';
import { Box, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import KeyIcon from '@mui/icons-material/Key';
import { type PrivatePollingDerivedState } from '../../../../api/src/index';
import { type UsePollingContractResult } from '../../hooks/usePollingContract';
import { Caption, Meter, Notice, Question, StatusChip, actionButtonSx, pct } from './ui';

type Props = { state: PrivatePollingDerivedState; contract: UsePollingContractResult };

export const TallyingSection: React.FC<Props> = ({ state, contract }) => {
  const { isLoading } = contract;
  const allSharesIn = state.trusteeCount > 0n && state.shareCount === state.trusteeCount;

  return (
    <Box>
      <StatusChip icon={<LockIcon />} label="Voting closed · decrypting" color="#9575cd" />
      <Question text={state.pollQuestion} />
      <Caption>
        {state.ballotCount.toString()} ballots cast. {state.shareCount.toString()} of {state.trusteeCount.toString()}{' '}
        trustees have submitted a decryption share.
      </Caption>
      <Meter value={pct(state.shareCount, state.trusteeCount)} />

      {state.isTrustee && !state.hasSubmittedShare && (
        <Button
          variant="contained"
          fullWidth
          startIcon={<KeyIcon />}
          disabled={isLoading}
          onClick={() => void contract.submitDecryptionShare()}
          sx={{ ...actionButtonSx, my: 1 }}
        >
          Submit my decryption share
        </Button>
      )}
      {state.isTrustee && state.hasSubmittedShare && !allSharesIn && (
        <Notice severity="success">Your share is in. Waiting for the remaining trustees.</Notice>
      )}

      {/* Deliberately open to everyone: once the shares are in the result is public data,
          so the organizer is not a gatekeeper on it being seen. */}
      {allSharesIn ? (
        <Button
          variant="contained"
          fullWidth
          startIcon={<HowToVoteIcon />}
          disabled={isLoading}
          onClick={() => void contract.publishTally()}
          sx={{ ...actionButtonSx, mt: 1 }}
        >
          Publish the result (anyone can do this)
        </Button>
      ) : (
        !state.isTrustee && <Caption color="#666">The result stays sealed until every trustee has contributed.</Caption>
      )}
    </Box>
  );
};
