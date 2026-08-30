/**
 * Board component
 *
 * Renders a single Private Poll card. Uses the `usePollingContract` hook
 * to drive all smart contract interactions (createPoll, enrollVoter, openVoting,
 * castVote, publishTally).
 *
 * Two modes:
 *  - No `boardDeployment$` prop → shows the empty "Deploy / Join" card
 *  - With `boardDeployment$` prop → shows the active poll card with live state
 */

import React, { useCallback, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useDeployedBoardContext } from '../hooks';
import { usePollingContract } from '../hooks/usePollingContract';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { PollState } from '../../../contract/src/managed/private-polling/contract/index.js';
import { EmptyCardContent } from './Board.EmptyCardContent';
import { type PrivatePollingDerivedState, VoteChoice } from '../../../api/src/index';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

// Shown while contract address is pending
const CONTRACT_ADDRESS_PLACEHOLDER =
  import.meta.env.VITE_CONTRACT_ADDRESS || '0200dbf964f541e1950883f5b2f539b66fd6111e46ce8e6e9551fbdd180114d5dd5b';

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct = (part: bigint, total: bigint): number => (total === 0n ? 0 : Math.round(Number((part * 100n) / total)));

const shortAddress = (addr: ContractAddress | null): string => {
  if (!addr) return 'Deploying…';
  if (addr.length <= 16) return `0x${addr}`;
  return `0x${addr.slice(0, 8)}…${addr.slice(-8)}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const VoteBar: React.FC<{
  label: string;
  icon: React.ReactNode;
  count: bigint;
  total: bigint;
  color: string;
}> = ({ label, icon, count, total, color }) => {
  const percentage = pct(count, total);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {icon}
          <Typography variant="caption" sx={{ color: '#bbb', fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#bbb' }}>
          {count.toString()} ({percentage}%)
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.08)',
          '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [commitmentInput, setCommitmentInput] = useState('');
  const [deadlineHours, setDeadlineHours] = useState('');
  const [quorumInput, setQuorumInput] = useState('');

  // All contract interactions go through this hook
  const {
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
  } = usePollingContract(boardDeployment$);

  // ── Navigation callbacks ──────────────────────────────────────────────────

  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);

  const onJoinBoard = useCallback(
    (addr: ContractAddress) => boardApiProvider.resolve(addr || CONTRACT_ADDRESS_PLACEHOLDER),
    [boardApiProvider],
  );

  // ── UI actions ────────────────────────────────────────────────────────────

  const onCreatePoll = useCallback(async () => {
    if (!questionPrompt.trim()) return;
    await createPoll(questionPrompt, Number(deadlineHours) || 0, Number(quorumInput) || 0);
    setQuestionPrompt('');
  }, [createPoll, questionPrompt, deadlineHours, quorumInput]);

  const onEnroll = useCallback(async () => {
    await enrollVoter(commitmentInput);
    setCommitmentInput('');
  }, [enrollVoter, commitmentInput]);

  const onCopyAddress = useCallback(async () => {
    await navigator.clipboard.writeText(contractAddress ?? CONTRACT_ADDRESS_PLACEHOLDER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contractAddress]);

  // ── Poll renderers ────────────────────────────────────────────────────────

  const renderRegistration = (state: PrivatePollingDerivedState) => (
    <Box>
      <Chip
        icon={<HowToVoteIcon sx={{ fontSize: '14px !important', color: '#ffa726 !important' }} />}
        label="Enrolling Voters"
        size="small"
        sx={{
          mb: 2,
          backgroundColor: 'rgba(255,167,38,0.1)',
          border: '1px solid rgba(255,167,38,0.3)',
          color: '#ffa726',
          fontSize: 11,
        }}
      />

      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.4, mb: 1, wordBreak: 'break-word' }}>
        {state.pollQuestion || 'Loading question…'}
      </Typography>

      <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 2 }}>
        {state.enrolledCount.toString()} voter{state.enrolledCount === 1n ? '' : 's'} enrolled. Voting has not opened
        yet — the roll is frozen the moment it does.
      </Typography>

      <Box
        sx={{
          p: 1,
          mb: 2,
          borderRadius: 1,
          border: '1px solid rgba(168,168,168,0.15)',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>
          Your enrolment commitment — send this to the organizer:
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#a8a8a8', wordBreak: 'break-all' }}>
          {state.myCommitment}
        </Typography>
      </Box>

      {state.isEligible && (
        <Chip
          icon={<CheckIcon sx={{ fontSize: '14px !important', color: '#4caf50 !important' }} />}
          label="You are enrolled"
          size="small"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(76,175,80,0.1)',
            border: '1px solid rgba(76,175,80,0.3)',
            color: '#4caf50',
            fontSize: 11,
          }}
        />
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>
          Decryption trustees: {state.trusteeCount.toString()}
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
          Every trustee must submit a share before the result can be opened, so a single honest trustee refusing to
          collude keeps the tally sealed.
        </Typography>
        {state.isTrustee ? (
          <Chip
            icon={<CheckIcon sx={{ fontSize: '14px !important', color: '#4caf50 !important' }} />}
            label="You are a trustee"
            size="small"
            sx={{
              backgroundColor: 'rgba(76,175,80,0.1)',
              border: '1px solid rgba(76,175,80,0.3)',
              color: '#4caf50',
              fontSize: 11,
            }}
          />
        ) : (
          <Button
            variant="outlined"
            size="small"
            disabled={isLoading}
            onClick={() => void registerTrustee()}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Become a trustee
          </Button>
        )}
      </Box>

      {state.isOwner && (
        <>
          <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)', mb: 2 }} />
          <TextField
            fullWidth
            size="small"
            placeholder="Voter commitment (64 hex characters)"
            value={commitmentInput}
            onChange={(e) => setCommitmentInput(e.target.value)}
            disabled={isLoading}
            sx={{ mb: 1, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 12 } }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              disabled={isLoading || !commitmentInput.trim()}
              onClick={() => void onEnroll()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Enroll voter
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              disabled={isLoading || state.enrolledCount === 0n || state.trusteeCount === 0n}
              onClick={() => void openVoting()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Open voting
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  const renderTallying = (state: PrivatePollingDerivedState) => {
    const allIn = state.shareCount === state.trusteeCount && state.trusteeCount > 0n;
    return (
      <Box>
        <Chip
          icon={<LockIcon sx={{ fontSize: '14px !important', color: '#7e57c2 !important' }} />}
          label="Voting closed · Decrypting"
          size="small"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(126,87,194,0.1)',
            border: '1px solid rgba(126,87,194,0.3)',
            color: '#7e57c2',
            fontSize: 11,
          }}
        />

        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.4, mb: 1.5 }}>
          {state.pollQuestion || 'Loading question…'}
        </Typography>

        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
          {state.shareCount.toString()} of {state.trusteeCount.toString()} trustees have submitted a decryption share.
          The result stays sealed until all of them do.
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct(state.shareCount, state.trusteeCount)}
          sx={{
            height: 6,
            borderRadius: 3,
            mb: 2,
            backgroundColor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': { backgroundColor: '#7e57c2', borderRadius: 3 },
          }}
        />

        {state.isTrustee && !state.hasSubmittedShare && (
          <Button
            variant="contained"
            size="small"
            fullWidth
            disabled={isLoading}
            onClick={() => void submitDecryptionShare()}
            sx={{ textTransform: 'none', fontWeight: 700, mb: 1 }}
          >
            Submit my decryption share
          </Button>
        )}

        {/* Deliberately open to everyone: once the shares are in, the result is public
            data and the organizer is not a gatekeeper on it being seen. */}
        {allIn && (
          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={<HowToVoteIcon />}
            disabled={isLoading}
            onClick={() => void publishTally()}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Publish the result (anyone can do this)
          </Button>
        )}
      </Box>
    );
  };

  const renderOpenPoll = (state: PrivatePollingDerivedState) => {
    const total = state.ballotCount;
    return (
      <Box>
        <Chip
          icon={<LockOpenIcon sx={{ fontSize: '14px !important', color: '#4caf50 !important' }} />}
          label="Poll Open · Voting Live"
          size="small"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(76,175,80,0.1)',
            border: '1px solid rgba(76,175,80,0.3)',
            color: '#4caf50',
            fontSize: 11,
          }}
        />

        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.4, mb: 2.5, wordBreak: 'break-word' }}
        >
          {state.pollQuestion || 'Loading question…'}
        </Typography>

        {/* No running tally is shown, because none exists to show: the aggregate is an
            ElGamal ciphertext until the organizer decrypts it. Turnout is public. */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
            {total.toString()} of {state.enrolledCount.toString()} enrolled voter
            {state.enrolledCount === 1n ? '' : 's'} have voted
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pct(total, state.enrolledCount)}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': { backgroundColor: '#7e57c2', borderRadius: 3 },
            }}
          />
          <Typography variant="caption" sx={{ color: '#7e57c2', display: 'block', mt: 1 }}>
            Results are sealed until voting closes — not even the organizer can read them yet.
          </Typography>
          {state.votingDeadline > 0n && (
            <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>
              Voting closes {new Date(Number(state.votingDeadline) * 1000).toLocaleString()}
            </Typography>
          )}
          {state.quorum > 0n && (
            <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
              Quorum: {total.toString()} / {state.quorum.toString()} ballots needed
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)', mb: 2 }} />

        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
          Cast your vote:
        </Typography>

        {/* Tell the voter where they stand before they spend minutes generating a proof
            that the circuit will reject. */}
        {!state.isEligible && (
          <Typography variant="caption" sx={{ color: '#f44336', display: 'block', mb: 1 }}>
            You are not on the eligibility roll for this poll, so a ballot would be rejected.
          </Typography>
        )}
        {state.isEligible && state.hasVoted && (
          <Typography variant="caption" sx={{ color: '#7e57c2', display: 'block', mb: 1 }}>
            Your ballot is recorded. You can change it any time before voting closes — only your last vote counts, so
            anyone who pressured you cannot rely on what they saw.
          </Typography>
        )}

        {/*
          Ballot secrecy is not implemented yet — `castVote` discloses the choice, so it is
          a public transaction input. Telling the user otherwise (or saying nothing) would
          let them act on a guarantee that does not exist. See PRIVACY.md.
        */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            mb: 1.5,
            p: 1,
            borderRadius: 1,
            border: '1px solid rgba(255,167,38,0.35)',
            backgroundColor: 'rgba(255,167,38,0.08)',
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 16, color: '#ffa726', mt: '1px' }} />
          <Typography variant="caption" sx={{ color: '#ffa726', lineHeight: 1.4 }}>
            Your choice is <strong>publicly visible</strong> on-chain in this version. Anonymous ballots are planned —
            don&apos;t use this for a sensitive vote yet.
          </Typography>
        </Box>

        {/* castVote circuit calls */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={<CheckIcon />}
            disabled={isLoading || !state.isEligible}
            onClick={() => void castVote(VoteChoice.Yes)}
            sx={{
              backgroundColor: 'rgba(76,175,80,0.2)',
              border: '1px solid rgba(76,175,80,0.5)',
              color: '#4caf50',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(76,175,80,0.35)' },
            }}
          >
            Yes
          </Button>
          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={<CloseIcon />}
            disabled={isLoading || !state.isEligible}
            onClick={() => void castVote(VoteChoice.No)}
            sx={{
              backgroundColor: 'rgba(244,67,54,0.2)',
              border: '1px solid rgba(244,67,54,0.5)',
              color: '#f44336',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(244,67,54,0.35)' },
            }}
          >
            No
          </Button>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<RemoveIcon />}
            disabled={isLoading || !state.isEligible}
            onClick={() => void castVote(VoteChoice.Abstain)}
            sx={{
              borderColor: 'rgba(158,158,158,0.4)',
              color: '#9e9e9e',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(158,158,158,0.1)' },
            }}
          >
            Abstain
          </Button>
        </Box>

        {/* Ends voting so trustees can decrypt. Creator, or anyone past the deadline. */}
        {(state.isOwner || (state.votingDeadline > 0n && Date.now() / 1000 > Number(state.votingDeadline))) && (
          <Button
            variant="text"
            size="small"
            fullWidth
            startIcon={<CancelIcon />}
            disabled={isLoading}
            onClick={() => void closeVoting()}
            sx={{
              color: '#666',
              textTransform: 'none',
              fontSize: 12,
              '&:hover': { color: '#f44336', backgroundColor: 'rgba(244,67,54,0.05)' },
            }}
          >
            Close voting and begin decryption
          </Button>
        )}
      </Box>
    );
  };

  const renderClosedPoll = (state: PrivatePollingDerivedState) => {
    const total = state.finalYes + state.finalNo + state.finalAbstain;
    return (
      <Box>
        {state.tallied && state.quorum > 0n && !state.quorumMet && (
          <Typography variant="caption" sx={{ color: '#ffa726', display: 'block', mb: 1.5 }}>
            Quorum not met ({total.toString()} of {state.quorum.toString()} required) — this result is published for
            transparency but is not binding.
          </Typography>
        )}
        <Chip
          icon={<LockIcon sx={{ fontSize: '14px !important', color: '#888 !important' }} />}
          label="Poll Closed"
          size="small"
          sx={{
            mb: 2,
            backgroundColor: 'rgba(168,168,168,0.08)',
            border: '1px solid rgba(168,168,168,0.2)',
            color: '#888',
            fontSize: 11,
          }}
        />

        {state.pollQuestion ? (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#bbb', mb: 2, wordBreak: 'break-word' }}>
              {state.pollQuestion}
            </Typography>
            {total > 0n && (
              <>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1 }}>
                  Final results ({total.toString()} vote{total !== 1n ? 's' : ''})
                </Typography>
                <VoteBar
                  label="Yes"
                  icon={<CheckIcon sx={{ fontSize: 12, color: '#4caf50' }} />}
                  count={state.finalYes}
                  total={total}
                  color="#4caf50"
                />
                <VoteBar
                  label="No"
                  icon={<CloseIcon sx={{ fontSize: 12, color: '#f44336' }} />}
                  count={state.finalNo}
                  total={total}
                  color="#f44336"
                />
                <VoteBar
                  label="Abstain"
                  icon={<RemoveIcon sx={{ fontSize: 12, color: '#9e9e9e' }} />}
                  count={state.finalAbstain}
                  total={total}
                  color="#9e9e9e"
                />
              </>
            )}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            No poll has been created yet.
          </Typography>
        )}

        <Divider sx={{ borderColor: 'rgba(168,168,168,0.1)', mb: 2 }} />

        <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
          Start a new poll:
        </Typography>

        <TextField
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          placeholder="Type your poll question…"
          size="small"
          value={questionPrompt}
          onChange={(e) => setQuestionPrompt(e.target.value)}
          sx={{
            mb: 1.5,
            '& .MuiOutlinedInput-root': {
              color: '#e0e0e0',
              '& fieldset': { borderColor: 'rgba(168,168,168,0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(168,168,168,0.4)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(168,168,168,0.6)' },
            },
          }}
        />

        {/* Both are enforced on-chain: the deadline stops ballots automatically, and the
            quorum flag prevents an under-attended vote being presented as a mandate. */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            type="number"
            label="Voting window (hours)"
            placeholder="none"
            value={deadlineHours}
            onChange={(e) => setDeadlineHours(e.target.value)}
            slotProps={{ inputLabel: { shrink: true, sx: { color: '#888' } } }}
            sx={{ '& .MuiOutlinedInput-root': { color: '#e0e0e0' } }}
          />
          <TextField
            size="small"
            fullWidth
            type="number"
            label="Quorum (ballots)"
            placeholder="none"
            value={quorumInput}
            onChange={(e) => setQuorumInput(e.target.value)}
            slotProps={{ inputLabel: { shrink: true, sx: { color: '#888' } } }}
            sx={{ '& .MuiOutlinedInput-root': { color: '#e0e0e0' } }}
          />
        </Box>

        {/* createPoll circuit call */}
        <Button
          variant="contained"
          fullWidth
          startIcon={<HowToVoteIcon />}
          disabled={!questionPrompt.trim() || isLoading}
          onClick={() => void onCreatePoll()}
          sx={{
            backgroundColor: 'rgba(168,168,168,0.15)',
            color: '#e0e0e0',
            border: '1px solid rgba(168,168,168,0.3)',
            textTransform: 'none',
            fontWeight: 700,
            '&:hover': { backgroundColor: 'rgba(168,168,168,0.25)' },
            '&:disabled': { color: '#444', borderColor: 'rgba(168,168,168,0.1)' },
          }}
        >
          Start Poll
        </Button>
      </Box>
    );
  };

  // ── Card render ───────────────────────────────────────────────────────────

  return (
    <Card
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: 400 },
        minHeight: 420,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(168,168,168,0.15)',
        borderRadius: 2,
        backdropFilter: 'blur(8px)',
        p: 0,
      }}
    >
      {/* Empty state */}
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {/* Active deployment */}
      {boardDeployment$ && (
        <>
          {/* Loading overlay */}
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: 10, borderRadius: 2, flexDirection: 'column', gap: 2 }}
            open={isLoading}
          >
            <CircularProgress data-testid="board-working-indicator" size={36} sx={{ color: '#a8a8a8' }} />
            <Typography variant="caption" sx={{ color: '#888' }}>
              {loadingMessage}
            </Typography>
          </Backdrop>

          {/* Error overlay */}
          <Backdrop
            sx={{ position: 'absolute', zIndex: 11, borderRadius: 2, p: 3 }}
            open={!!error}
            onClick={clearError}
          >
            <Box
              sx={{
                background: 'rgba(10,10,15,0.95)',
                border: '1px solid rgba(244,67,54,0.4)',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 36, color: '#f44336', mb: 1 }} />
              <Typography variant="body2" data-testid="board-error-message" sx={{ color: '#f44336', mb: 1 }}>
                {error}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Auto-dismisses in a few seconds · tap to dismiss now
              </Typography>
            </Box>
          </Backdrop>

          {/* Card header */}
          <CardHeader
            sx={{ borderBottom: '1px solid rgba(168,168,168,0.1)', pb: 1.5 }}
            avatar={
              pollState ? (
                pollState.pollState === PollState.OPEN ? (
                  <LockOpenIcon sx={{ color: '#4caf50' }} data-testid="post-unlocked-icon" />
                ) : pollState.pollState === PollState.REGISTRATION ? (
                  <HowToVoteIcon sx={{ color: '#ffa726' }} data-testid="post-registration-icon" />
                ) : (
                  <LockIcon sx={{ color: '#666' }} data-testid="post-locked-icon" />
                )
              ) : (
                <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
              )
            }
            title={
              <Typography
                variant="caption"
                sx={{ fontFamily: 'monospace', color: '#a8a8a8', fontSize: 11 }}
                data-testid="board-address"
              >
                {shortAddress(contractAddress)}
              </Typography>
            }
            subheader={
              <Typography variant="caption" sx={{ color: '#555', fontSize: 10 }}>
                {isLoading && currentAction === 'deploy' ? 'Deploying contract…' : 'Contract deployed · Preprod'}
              </Typography>
            }
            action={
              <Tooltip title={copied ? 'Copied!' : 'Copy contract address'}>
                <IconButton
                  size="small"
                  onClick={() => void onCopyAddress()}
                  sx={{ color: copied ? '#4caf50' : '#666' }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          />

          <CardContent sx={{ pt: 2 }}>
            {pollState ? (
              pollState.pollState === PollState.OPEN ? (
                renderOpenPoll(pollState)
              ) : pollState.pollState === PollState.REGISTRATION ? (
                renderRegistration(pollState)
              ) : pollState.pollState === PollState.TALLYING ? (
                renderTallying(pollState)
              ) : (
                renderClosedPoll(pollState)
              )
            ) : (
              <Box>
                <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 1 }} height={28} />
                <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 2 }} height={20} width="60%" />
                <Skeleton
                  variant="rectangular"
                  sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 1 }}
                  height={80}
                />
              </Box>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
};
