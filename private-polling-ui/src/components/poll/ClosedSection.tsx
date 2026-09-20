import React, { useMemo, useState } from 'react';
import { Box, Button, Divider, FormControlLabel, Switch, TextField } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { type PrivatePollingDerivedState } from '../../../../api/src/index';
import { type UsePollingContractResult } from '../../hooks/usePollingContract';
import { pollSetupFromUrl } from '../../config/product';
import { Caption, Notice, StatusChip, VoteBar, actionButtonSx } from './ui';
import { tokens } from '../../config/theme';

type Props = { state: PrivatePollingDerivedState; contract: UsePollingContractResult };

const inputSx = { '& .MuiOutlinedInput-root': { color: tokens.ink } } as const;

const CreatePollForm: React.FC<{ contract: UsePollingContractResult }> = ({ contract }) => {
  // A link may carry the setup (?q=…&hours=…&quorum=…), so the organizer only confirms it.
  const prefill = useMemo(pollSetupFromUrl, []);
  const [question, setQuestion] = useState(prefill.question);
  const [hours, setHours] = useState(prefill.hours);
  const [quorum, setQuorum] = useState(prefill.quorum);
  const [openEnrollment, setOpenEnrollment] = useState(prefill.openEnrollment);

  const submit = async () => {
    const ok = await contract.createPoll({
      question,
      deadlineHours: Number(hours) || 0,
      quorum: Number(quorum) || 0,
      openEnrollment,
    });
    if (ok) {
      setQuestion('');
      setHours('');
      setQuorum('');
    }
  };

  return (
    <Box>
      <Caption color="#bbb">Start a new poll</Caption>
      <TextField
        fullWidth
        multiline
        rows={2}
        size="small"
        placeholder="Type your poll question…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 280 } }}
        sx={{ mb: 1.5, ...inputSx }}
      />
      {/* Both are enforced on-chain: the deadline stops ballots automatically, and the
          quorum flag stops an under-attended vote being presented as a mandate. */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          size="small"
          fullWidth
          type="number"
          label="Voting window (hours)"
          placeholder="none"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }}
          sx={inputSx}
        />
        <TextField
          size="small"
          fullWidth
          type="number"
          label="Quorum (ballots)"
          placeholder="none"
          value={quorum}
          onChange={(e) => setQuorum(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }}
          sx={inputSx}
        />
      </Box>
      <FormControlLabel
        control={<Switch size="small" checked={openEnrollment} onChange={(e) => setOpenEnrollment(e.target.checked)} />}
        label={
          <Caption mb={0} color="#bbb">
            {openEnrollment
              ? 'Open enrollment — anyone with the link can join (best for public polls)'
              : 'Invite-only — you enrol each voter (best for binding votes)'}
          </Caption>
        }
        sx={{ mb: 1.5, ml: 0 }}
      />
      <Button
        variant="contained"
        fullWidth
        startIcon={<HowToVoteIcon />}
        disabled={!question.trim() || contract.isLoading}
        onClick={() => void submit()}
        sx={actionButtonSx}
      >
        Start poll
      </Button>
    </Box>
  );
};

export const ClosedSection: React.FC<Props> = ({ state, contract }) => {
  const total = state.finalYes + state.finalNo + state.finalAbstain;

  return (
    <Box>
      <StatusChip
        icon={<LockIcon />}
        label={state.tallied ? 'Poll closed · result verified' : 'No poll running'}
        color="#9e9e9e"
      />

      {state.pollQuestion ? (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ fontWeight: 600, color: tokens.ink, mb: 1.5, wordBreak: 'break-word' }}>{state.pollQuestion}</Box>
          {state.tallied && state.quorum > 0n && !state.quorumMet && (
            <Notice severity="warning">
              Quorum not met ({total.toString()} of {state.quorum.toString()} required) — published for transparency,
              but not binding.
            </Notice>
          )}
          {state.tallied && (
            <>
              <Caption>
                Final result · {total.toString()} ballot{total === 1n ? '' : 's'} · re-encryption checked on-chain
              </Caption>
              <VoteBar
                label="Yes"
                icon={<CheckIcon sx={{ fontSize: 12, color: tokens.affirm }} />}
                count={state.finalYes}
                total={total}
                color="#4caf50"
              />
              <VoteBar
                label="No"
                icon={<CloseIcon sx={{ fontSize: 12, color: tokens.against }} />}
                count={state.finalNo}
                total={total}
                color="#f44336"
              />
              <VoteBar
                label="Abstain"
                icon={<RemoveIcon sx={{ fontSize: 12, color: tokens.neutral }} />}
                count={state.finalAbstain}
                total={total}
                color="#9e9e9e"
              />
            </>
          )}
        </Box>
      ) : (
        <Caption>No poll has been started on this contract yet.</Caption>
      )}

      {state.isAdmin ? (
        <>
          <Divider sx={{ borderColor: tokens.rule, mb: 2 }} />
          <CreatePollForm contract={contract} />
        </>
      ) : (
        <Caption color="#666">
          Only the wallet that deployed this contract can start the next poll here. Want your own? Use “Create your own
          poll” below.
        </Caption>
      )}
    </Box>
  );
};
