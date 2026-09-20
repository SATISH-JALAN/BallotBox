import React from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { PollState } from '../../../contract/src/managed/private-polling/contract/index.js';
import { usePublicPollPreview } from '../hooks/usePublicPollPreview';
import { Caption, Meter, pct, shortHex, VoteBar } from './poll/ui';
import { microLabelSx, mono, tokens } from '../config/theme';

const STAGE: Record<PollState, { label: string; color: string }> = {
  [PollState.CLOSED]: { label: 'Closed', color: tokens.neutral },
  [PollState.REGISTRATION]: { label: 'Enrollment open', color: tokens.caution },
  [PollState.OPEN]: { label: 'Voting live', color: tokens.affirm },
  [PollState.TALLYING]: { label: 'Decrypting', color: tokens.ink },
};

export interface FeaturedPollProps {
  readonly address: string;
  readonly fromInviteLink: boolean;
  readonly onOpen: () => void;
}

/** A public, wallet-free preview of the featured or shared poll, with one button to take part. */
export const FeaturedPoll: React.FC<FeaturedPollProps> = ({ address, fromInviteLink, onOpen }) => {
  const { preview, status } = usePublicPollPreview(address);
  const stage = preview ? STAGE[preview.pollState] : undefined;
  const total = preview ? preview.finalYes + preview.finalNo + preview.finalAbstain : 0n;
  const participating =
    preview && (preview.pollState === PollState.REGISTRATION || preview.pollState === PollState.OPEN);

  return (
    <Card
      data-testid="featured-poll"
      sx={{
        width: { xs: '100%', sm: 460 },
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.rule}`,
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography sx={{ ...microLabelSx, lineHeight: 1 }}>
            {fromInviteLink ? 'You were invited to a poll' : 'Featured public poll'}
          </Typography>
          {stage && (
            <Chip
              size="small"
              label={stage.label}
              sx={{
                color: stage.color,
                border: `1px solid ${tokens.rule}`,
                backgroundColor: 'transparent',
                fontSize: 11,
              }}
            />
          )}
        </Box>

        {status === 'loading' && !preview && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={18} />
            <Caption mb={0}>Reading the poll from Midnight…</Caption>
          </Box>
        )}
        {(status === 'not-found' || status === 'error') && !preview && (
          <Caption color="#ffa726">
            {status === 'not-found'
              ? 'No poll found at this address on this network.'
              : 'Could not read this poll. It may not exist on this network (Preprod is occasionally reset), or the indexer is unreachable.'}
          </Caption>
        )}

        {preview && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.ink, lineHeight: 1.35, mb: 1.5 }}>
              {preview.question ?? 'No poll has been started on this contract yet.'}
            </Typography>
            {participating && (
              <>
                <Caption>
                  {preview.ballots.toString()} ballots from {preview.enrolled.toString()} enrolled ·{' '}
                  {preview.openEnrollment ? 'anyone can join' : 'invite-only'}
                  {preview.votingDeadline > 0n &&
                    ` · closes ${new Date(Number(preview.votingDeadline) * 1000).toLocaleDateString()}`}
                </Caption>
                <Meter value={pct(preview.ballots, preview.enrolled)} />
              </>
            )}
            {preview.tallied && preview.pollState === PollState.CLOSED && total > 0n && (
              <Box sx={{ mt: 1 }}>
                <VoteBar label="Yes" icon={null} count={preview.finalYes} total={total} color="#4caf50" />
                <VoteBar label="No" icon={null} count={preview.finalNo} total={total} color="#f44336" />
                <VoteBar label="Abstain" icon={null} count={preview.finalAbstain} total={total} color="#9e9e9e" />
              </Box>
            )}
            <Caption color="#777">{preview.participants.toString()} wallets have checked in as testers</Caption>
          </>
        )}

        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<HowToVoteIcon />}
          onClick={onOpen}
          sx={{
            mt: 2,
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: tokens.ink,
            '&:hover': { backgroundColor: '#000' },
          }}
        >
          {participating ? 'Connect wallet & take part' : 'Connect wallet & open poll'}
        </Button>
        <Typography variant="caption" sx={{ color: tokens.inkFaint, display: 'block', mt: 1, fontFamily: mono }}>
          {shortHex(address, 12, 10)}
        </Typography>
      </CardContent>
    </Card>
  );
};
