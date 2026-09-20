/**
 * Board — one poll card.
 *
 * Without `boardDeployment$` it renders the "create or open a poll" card. With one, it
 * subscribes through `usePollingContract` and renders the section for the poll's current
 * lifecycle state. All contract calls live in that hook; this file only lays them out.
 */

import React, { useCallback, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Alert,
  Backdrop,
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  IconButton,
  Skeleton,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import KeyIcon from '@mui/icons-material/VpnKey';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { type Observable } from 'rxjs';
import { PollState } from '../../../contract/src/managed/private-polling/contract/index.js';
import { useDeployedBoardContext } from '../hooks';
import { usePollingContract } from '../hooks/usePollingContract';
import { type BoardDeployment } from '../contexts';
import { NETWORK_ID, pollShareUrl } from '../config/product';
import { EmptyCardContent } from './Board.EmptyCardContent';
import { KeyBackupDialog } from './KeyBackupDialog';
import { ClosedSection } from './poll/ClosedSection';
import { ParticipantCheckIn } from './poll/ParticipantCheckIn';
import { PollStepper } from './poll/PollStepper';
import { RegistrationSection } from './poll/RegistrationSection';
import { TallyingSection } from './poll/TallyingSection';
import { VotingSection } from './poll/VotingSection';
import { TxLink, shortHex } from './poll/ui';
import { mono, tokens } from '../config/theme';

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

const Copyable: React.FC<{ value: string; title: string; icon: React.ReactElement }> = ({ value, title, icon }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip title={copied ? 'Copied!' : title}>
      <IconButton
        size="small"
        aria-label={title}
        onClick={() =>
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2_000);
          })
        }
        sx={{ color: copied ? tokens.affirm : tokens.inkMuted }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
};

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const contract = usePollingContract(boardDeployment$);
  const { pollState, contractAddress, isLoading, currentAction, loadingMessage, elapsedSeconds, error } = contract;
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);

  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback((addr: ContractAddress) => boardApiProvider.resolve(addr), [boardApiProvider]);

  const renderSection = () => {
    if (!pollState) {
      return (
        <Box>
          <Skeleton variant="text" sx={{ bgcolor: tokens.sunken, mb: 1 }} height={28} />
          <Skeleton variant="text" sx={{ bgcolor: tokens.sunken, mb: 2 }} height={20} width="60%" />
          <Skeleton variant="rectangular" sx={{ bgcolor: tokens.sunken, borderRadius: 1 }} height={80} />
        </Box>
      );
    }
    switch (pollState.pollState) {
      case PollState.REGISTRATION:
        return <RegistrationSection state={pollState} contract={contract} />;
      case PollState.OPEN:
        return <VotingSection state={pollState} contract={contract} />;
      case PollState.TALLYING:
        return <TallyingSection state={pollState} contract={contract} />;
      default:
        return <ClosedSection state={pollState} contract={contract} />;
    }
  };

  return (
    <Card
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: 460 },
        minHeight: 420,
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.rule}`,
        borderRadius: 2,
      }}
    >
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {boardDeployment$ && (
        <>
          <Backdrop
            sx={{
              position: 'absolute',
              color: tokens.ink,
              zIndex: 10,
              borderRadius: 2,
              // Opaque enough that the form underneath does not bleed through the progress text.
              backgroundColor: 'rgba(242,239,232,0.94)',
              backdropFilter: 'blur(2px)',
              flexDirection: 'column',
              gap: 1.5,
              px: 3,
            }}
            open={isLoading}
          >
            <CircularProgress data-testid="board-working-indicator" size={36} sx={{ color: tokens.ink }} />
            <Typography variant="body2" sx={{ color: tokens.ink, textAlign: 'center' }}>
              {loadingMessage}
            </Typography>
            {currentAction !== 'deploy' && (
              <Typography variant="caption" sx={{ color: tokens.inkMuted, textAlign: 'center' }}>
                {elapsedSeconds}s · zero-knowledge proofs usually take 30–120 seconds. Approve the transaction in your
                wallet when it asks.
              </Typography>
            )}
          </Backdrop>

          <CardHeader
            sx={{ borderBottom: `1px solid ${tokens.rule}`, pb: 1.5 }}
            avatar={<HowToVoteIcon sx={{ color: tokens.ink }} />}
            title={
              <Typography
                variant="caption"
                sx={{ display: 'block', fontFamily: mono, color: tokens.inkMuted, fontSize: 11 }}
                data-testid="board-address"
              >
                {contractAddress ? shortHex(contractAddress, 10, 8) : 'Loading poll…'}
              </Typography>
            }
            subheader={
              <Typography variant="caption" sx={{ display: 'block', color: tokens.inkFaint, fontSize: 10 }}>
                Midnight {NETWORK_ID}
                {pollState?.isAdmin ? ' · you are the admin' : pollState?.isOwner ? ' · you organize this poll' : ''}
              </Typography>
            }
            action={
              contractAddress && (
                <Box sx={{ display: 'flex' }}>
                  <Copyable
                    value={pollShareUrl(contractAddress)}
                    title="Copy invite link"
                    icon={<ShareIcon fontSize="small" />}
                  />
                  <Copyable
                    value={contractAddress}
                    title="Copy contract address"
                    icon={<ContentCopyIcon fontSize="small" />}
                  />
                  <Tooltip title="Back up or restore your key">
                    <IconButton
                      size="small"
                      aria-label="Key backup"
                      onClick={() => setKeyDialogOpen(true)}
                      sx={{ color: tokens.inkMuted }}
                    >
                      <KeyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )
            }
          />

          <CardContent sx={{ pt: 2 }}>
            {error && (
              <Alert
                severity="error"
                onClose={contract.clearError}
                data-testid="board-error-message"
                sx={{ mb: 2, fontSize: 12 }}
              >
                {error}
              </Alert>
            )}
            {pollState && <PollStepper state={pollState} />}
            {renderSection()}
            {pollState && <ParticipantCheckIn state={pollState} contract={contract} />}
          </CardContent>

          {contractAddress && (
            <KeyBackupDialog
              open={keyDialogOpen}
              contractAddress={contractAddress}
              onClose={() => setKeyDialogOpen(false)}
            />
          )}

          <Snackbar
            open={contract.lastReceipt !== null}
            autoHideDuration={12_000}
            onClose={contract.clearReceipt}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert severity="success" variant="filled" onClose={contract.clearReceipt} sx={{ alignItems: 'center' }}>
              {contract.lastReceipt?.label}
              {contract.lastReceipt && (
                <Typography variant="caption" component="div">
                  tx <TxLink txHash={contract.lastReceipt.txHash} /> · block {contract.lastReceipt.blockHeight}
                </Typography>
              )}
            </Alert>
          </Snackbar>
        </>
      )}
    </Card>
  );
};
