import React, { useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Box, Button, CardContent, Divider, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import LinkIcon from '@mui/icons-material/Link';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { TextPromptDialog } from './TextPromptDialog';
import { tokens } from '../config/theme';

export interface EmptyCardContentProps {
  onCreateBoardCallback: () => void;
  onJoinBoardCallback: (contractAddress: ContractAddress) => void;
}

/** Extracts a contract address from either a bare address or a pasted invite link. */
const addressFromInput = (text: string): string => {
  const trimmed = text.trim();
  try {
    return new URL(trimmed).searchParams.get('poll') ?? trimmed;
  } catch {
    return trimmed;
  }
};

export const EmptyCardContent: React.FC<Readonly<EmptyCardContentProps>> = ({
  onCreateBoardCallback,
  onJoinBoardCallback,
}) => {
  const [textPromptOpen, setTextPromptOpen] = useState(false);

  return (
    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ textAlign: 'center', pt: 1 }}>
        <HowToVoteIcon sx={{ fontSize: 48, color: tokens.inkFaint, mb: 1 }} />
        <Typography variant="body1" sx={{ fontWeight: 700, color: tokens.ink }}>
          Create your own poll
        </Typography>
        <Typography
          data-testid="board-posted-message"
          variant="caption"
          sx={{ color: tokens.inkMuted, display: 'block', mt: 0.5 }}
        >
          Deploy a poll contract you control, or open one someone shared with you.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: tokens.rule }} />

      <Button
        data-testid="board-deploy-btn"
        variant="contained"
        fullWidth
        startIcon={<AddCircleOutlineIcon />}
        onClick={onCreateBoardCallback}
        sx={{ textTransform: 'none', fontWeight: 600 }}
      >
        Deploy a new poll contract
      </Button>

      <Button
        data-testid="board-join-btn"
        variant="outlined"
        fullWidth
        startIcon={<LinkIcon />}
        onClick={() => setTextPromptOpen(true)}
        sx={{ textTransform: 'none', fontWeight: 600 }}
      >
        Open a poll by link or address
      </Button>

      <Typography variant="caption" sx={{ color: tokens.inkFaint, textAlign: 'center', lineHeight: 1.5 }}>
        Deploying makes your wallet the contract admin. Back up your key afterwards (the key icon on the poll card) — it
        is the only way to run future polls on that contract.
      </Typography>

      <TextPromptDialog
        prompt="Paste an invite link or poll contract address"
        isOpen={textPromptOpen}
        onCancel={() => setTextPromptOpen(false)}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          const address = addressFromInput(text);
          if (address) onJoinBoardCallback(address);
        }}
      />
    </CardContent>
  );
};
