import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { type PrivatePollingDerivedState } from '../../../../api/src/index';
import { type UsePollingContractResult } from '../../hooks/usePollingContract';
import { actionButtonSx } from './ui';
import { tokens } from '../../config/theme';

/**
 * Opt-in participant check-in.
 *
 * Explains the trade before asking: checking in publishes this wallet's coin public key in
 * the contract's participant set. It is never connected to a ballot — the set is separate
 * from the voter roll and nullifiers — but it is public, so it is never automatic.
 */
export const ParticipantCheckIn: React.FC<{
  state: PrivatePollingDerivedState;
  contract: UsePollingContractResult;
}> = ({ state, contract }) => (
  <Box
    sx={{
      mt: 2,
      p: 1.5,
      borderRadius: 1.5,
      border: `1px dashed ${tokens.ruleStrong}`,
      backgroundColor: tokens.sunken,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <VerifiedIcon sx={{ fontSize: 16, color: tokens.ink }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.ink }}>
        {state.participantCount.toString()} wallet{state.participantCount === 1n ? '' : 's'} checked in as testers
      </Typography>
    </Box>
    {state.hasCheckedIn ? (
      <Typography variant="caption" sx={{ color: tokens.ink }}>
        You are counted. Thank you for testing!
      </Typography>
    ) : (
      <>
        <Typography variant="caption" component="p" sx={{ color: tokens.inkMuted, lineHeight: 1.5, mb: 1 }}>
          Help us show real usage: check in to add this wallet to the public tester list. It is recorded separately from
          polls and ballots, so it never reveals how you voted.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={contract.isLoading}
          onClick={() => void contract.checkIn()}
          sx={{ ...actionButtonSx, borderColor: tokens.ruleStrong, color: tokens.ink }}
        >
          Count me as a tester
        </Button>
      </>
    )}
  </Box>
);
