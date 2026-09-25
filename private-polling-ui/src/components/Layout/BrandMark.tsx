import React from 'react';
import { Box } from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { tokens } from '../../config/theme';

/** Small ink badge used next to the wordmark in the header and footer. */
export const BrandMark: React.FC<{ readonly inverted?: boolean }> = ({ inverted = false }) => (
  <Box
    aria-hidden
    sx={{
      width: 28,
      height: 28,
      borderRadius: 1.5,
      display: 'grid',
      placeItems: 'center',
      backgroundColor: inverted ? tokens.surface : tokens.ink,
      color: inverted ? tokens.ink : tokens.surface,
      transition: 'background-color 0.35s, color 0.35s',
    }}
  >
    <HowToVoteIcon sx={{ fontSize: 17 }} />
  </Box>
);
