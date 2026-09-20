import React from 'react';
import { AppBar, Box, IconButton, Tooltip, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import XIcon from '@mui/icons-material/X';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { WalletConnectButton } from '../WalletConnectButton';
import { LINKS, NETWORK_ID, PRODUCT } from '../../config/product';
import { microLabelSx, tokens } from '../../config/theme';

const iconLinkSx = {
  color: tokens.inkMuted,
  '&:hover': { color: tokens.ink, backgroundColor: 'transparent' },
  display: { xs: 'none', sm: 'inline-flex' },
} as const;

/** Masthead — wordmark, network, outbound links, wallet. */
export const Header: React.FC = () => (
  <AppBar
    position="static"
    elevation={0}
    data-testid="header"
    sx={{
      backgroundColor: tokens.paper,
      backgroundImage: 'none',
      borderBottom: `1px solid ${tokens.rule}`,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: { xs: 2.5, md: 5 },
      py: 1.5,
      gap: 1,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, minWidth: 0 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: tokens.ink, lineHeight: 1 }}>
        {PRODUCT.name}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: tokens.inkMuted, display: { xs: 'none', sm: 'block' }, whiteSpace: 'nowrap' }}
      >
        {PRODUCT.tagline}
      </Typography>
    </Box>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography
        sx={{
          ...microLabelSx,
          color: tokens.caution,
          border: `1px solid ${tokens.rule}`,
          borderRadius: 1,
          px: 1,
          py: 0.5,
          mr: 1,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {NETWORK_ID}
      </Typography>
      <Tooltip title="User guide">
        <IconButton component="a" href={LINKS.userGuide} target="_blank" rel="noopener noreferrer" sx={iconLinkSx}>
          <MenuBookIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {LINKS.x && (
        <Tooltip title={`${PRODUCT.name} on X`}>
          <IconButton component="a" href={LINKS.x} target="_blank" rel="noopener noreferrer" sx={iconLinkSx}>
            <XIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Source code">
        <IconButton component="a" href={LINKS.github} target="_blank" rel="noopener noreferrer" sx={iconLinkSx}>
          <GitHubIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ ml: 1 }}>
        <WalletConnectButton networkId={NETWORK_ID} />
      </Box>
    </Box>
  </AppBar>
);
