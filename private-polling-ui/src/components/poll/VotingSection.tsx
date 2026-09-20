import React from 'react';
import { Box, Button, Divider } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import { type PrivatePollingDerivedState, VoteChoice } from '../../../../api/src/index';
import { type UsePollingContractResult } from '../../hooks/usePollingContract';
import { CommitmentBox } from './RegistrationSection';
import { Caption, Meter, Notice, Question, StatusChip, actionButtonSx, pct } from './ui';
import { tokens } from '../../config/theme';

type Props = { state: PrivatePollingDerivedState; contract: UsePollingContractResult };

const CHOICES = [
  { choice: VoteChoice.Yes, label: 'Yes', icon: <CheckIcon />, text: tokens.affirm },
  { choice: VoteChoice.No, label: 'No', icon: <CloseIcon />, text: tokens.against },
  { choice: VoteChoice.Abstain, label: 'Abstain', icon: <RemoveIcon />, text: tokens.neutral },
] as const;

export const VotingSection: React.FC<Props> = ({ state, contract }) => {
  const { isLoading } = contract;
  const nowSeconds = Date.now() / 1000;
  const deadlinePassed = state.votingDeadline > 0n && nowSeconds > Number(state.votingDeadline);
  const canClose = state.isOwner || deadlinePassed;

  return (
    <Box>
      <StatusChip icon={<LockOpenIcon />} label="Voting live" color="#4caf50" />
      <Question text={state.pollQuestion} />

      {/* No running tally exists to show: the aggregate is an ElGamal ciphertext until every
          trustee contributes a share. Turnout is public. */}
      <Caption>
        {state.ballotCount.toString()} of {state.enrolledCount.toString()} enrolled voters have voted
      </Caption>
      <Meter value={pct(state.ballotCount, state.enrolledCount)} />
      <Caption color="#9575cd">Results stay sealed until voting closes — not even the organizer can read them.</Caption>
      {state.votingDeadline > 0n && (
        <Caption>
          {deadlinePassed ? 'Deadline passed' : 'Voting closes'}{' '}
          {new Date(Number(state.votingDeadline) * 1000).toLocaleString()}
        </Caption>
      )}
      {state.quorum > 0n && (
        <Caption>
          Quorum: {state.ballotCount.toString()} / {state.quorum.toString()} ballots
        </Caption>
      )}

      <Divider sx={{ borderColor: tokens.rule, my: 2 }} />

      {!state.isEligible && state.openEnrollment && !deadlinePassed && (
        <>
          <Notice>Join the poll first — it takes one quick transaction — then cast your ballot.</Notice>
          <Button
            variant="contained"
            fullWidth
            startIcon={<HowToRegIcon />}
            disabled={isLoading}
            onClick={() => void contract.selfEnroll()}
            sx={{ ...actionButtonSx, mb: 2 }}
          >
            Join this poll
          </Button>
        </>
      )}
      {!state.isEligible && !state.openEnrollment && (
        <>
          <Notice severity="warning">
            You are not on this invite-only roll, and enrollment closed when voting opened.
          </Notice>
          <CommitmentBox commitment={state.myCommitment} />
        </>
      )}
      {state.isEligible && state.hasVoted && (
        <Notice severity="success">
          Your ballot is recorded. You can change it until voting closes — only your last vote counts, so nobody can
          rely on what they saw you choose.
        </Notice>
      )}

      {state.isEligible && (
        <>
          <Caption>{state.hasVoted ? 'Change your vote:' : 'Cast your encrypted ballot:'}</Caption>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {CHOICES.map(({ choice, label, icon, text }) => (
              <Button
                key={label}
                variant="outlined"
                size="small"
                fullWidth
                startIcon={icon}
                disabled={isLoading || deadlinePassed}
                onClick={() => void contract.castVote(choice)}
                sx={{
                  ...actionButtonSx,
                  py: 1,
                  backgroundColor: '#fff',
                  borderColor: tokens.rule,
                  color: tokens.ink,
                  '& .MuiButton-startIcon': { color: text },
                  '&:hover': { borderColor: text, backgroundColor: '#fff' },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
        </>
      )}

      {canClose && (
        <Button
          variant="text"
          size="small"
          fullWidth
          startIcon={<CancelIcon />}
          disabled={isLoading}
          onClick={() => void contract.closeVoting()}
          sx={{ color: tokens.inkMuted, textTransform: 'none', fontSize: 12, '&:hover': { color: tokens.against } }}
        >
          Close voting and begin decryption
        </Button>
      )}
    </Box>
  );
};
