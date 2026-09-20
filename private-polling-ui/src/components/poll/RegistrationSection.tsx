import React, { useState } from 'react';
import { Box, Button, Divider, TextField, Tooltip } from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { type PrivatePollingDerivedState } from '../../../../api/src/index';
import { type UsePollingContractResult } from '../../hooks/usePollingContract';
import { Caption, Notice, Question, StatusChip, actionButtonSx, plural } from './ui';
import { mono, tokens } from '../../config/theme';

type Props = { state: PrivatePollingDerivedState; contract: UsePollingContractResult };

/** Copyable enrolment commitment, for invite-only polls where the organizer enrols you. */
export const CommitmentBox: React.FC<{ commitment: string }> = ({ commitment }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Box
      sx={{
        p: 1,
        mb: 2,
        borderRadius: 1,
        border: `1px solid ${tokens.rule}`,
        backgroundColor: tokens.sunken,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Caption mb={0.5}>Your enrolment commitment — send this to the organizer:</Caption>
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <Button
            size="small"
            onClick={() =>
              void navigator.clipboard.writeText(commitment).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2_000);
              })
            }
            sx={{ minWidth: 0, color: copied ? tokens.affirm : tokens.inkMuted }}
          >
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </Button>
        </Tooltip>
      </Box>
      <Box component="code" sx={{ fontSize: 11, color: tokens.inkMuted, wordBreak: 'break-all' }}>
        {commitment}
      </Box>
    </Box>
  );
};

export const RegistrationSection: React.FC<Props> = ({ state, contract }) => {
  const [commitments, setCommitments] = useState('');
  const { isLoading } = contract;

  return (
    <Box>
      <StatusChip icon={<HowToRegIcon />} label="Enrollment open · voting not started" color="#ffa726" />
      <Question text={state.pollQuestion} />
      <Caption>
        {plural(state.enrolledCount, 'voter')} enrolled ·{' '}
        {state.openEnrollment ? 'anyone can join' : 'invite-only (organizer enrols voters)'}
      </Caption>

      {state.isEligible ? (
        <Notice severity="success">You are enrolled. Come back when voting opens to cast your ballot.</Notice>
      ) : state.openEnrollment ? (
        <Button
          variant="contained"
          fullWidth
          startIcon={<HowToRegIcon />}
          disabled={isLoading}
          onClick={() => void contract.selfEnroll()}
          sx={{ ...actionButtonSx, mb: 2, mt: 1 }}
        >
          Join this poll
        </Button>
      ) : (
        <CommitmentBox commitment={state.myCommitment} />
      )}

      <Divider sx={{ borderColor: tokens.rule, my: 2 }} />

      <Caption>
        Decryption trustees: {state.trusteeCount.toString()}. Every trustee must submit a share before the result can be
        opened, so one honest trustee is enough to stop anyone peeking early.
      </Caption>
      {state.isTrustee ? (
        <StatusChip icon={<CheckIcon />} label="You are a trustee — keep your key backed up" color="#4caf50" />
      ) : (
        <Button
          variant="outlined"
          size="small"
          disabled={isLoading}
          onClick={() => void contract.registerTrustee()}
          sx={{ ...actionButtonSx, mb: 2 }}
        >
          Become a trustee
        </Button>
      )}

      {state.isOwner && (
        <>
          <Divider sx={{ borderColor: tokens.rule, my: 2 }} />
          <Caption color="#bbb">Organizer tools</Caption>
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            placeholder="Voter commitments — one per line (64 hex characters each)"
            value={commitments}
            onChange={(e) => setCommitments(e.target.value)}
            disabled={isLoading}
            sx={{ mb: 1, '& .MuiInputBase-input': { fontFamily: mono, fontSize: 12 } }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              disabled={isLoading || !commitments.trim()}
              onClick={() =>
                void contract.enrollVoters(commitments).then((ok) => {
                  if (ok) setCommitments('');
                })
              }
              sx={actionButtonSx}
            >
              Enrol voters
            </Button>
            <Tooltip
              title={
                state.trusteeCount === 0n
                  ? 'Register at least one trustee first'
                  : state.enrolledCount === 0n && !state.openEnrollment
                    ? 'Enrol at least one voter first'
                    : ''
              }
            >
              <span style={{ width: '100%' }}>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  disabled={
                    isLoading || state.trusteeCount === 0n || (state.enrolledCount === 0n && !state.openEnrollment)
                  }
                  onClick={() => void contract.openVoting()}
                  sx={actionButtonSx}
                >
                  Open voting
                </Button>
              </span>
            </Tooltip>
          </Box>
          {state.openEnrollment && (
            <Caption color="#666" mb={0}>
              Open enrollment stays available after voting opens, so late joiners can still take part.
            </Caption>
          )}
        </>
      )}
    </Box>
  );
};
