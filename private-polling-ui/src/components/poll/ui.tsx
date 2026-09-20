/** Small presentational pieces shared by every poll section. */

import React from 'react';
import { Alert, Box, LinearProgress, Link, Typography, type AlertColor } from '@mui/material';
import { explorerTxUrl } from '../../config/product';
import { microLabelSx, mono, tokens } from '../../config/theme';

export const pct = (part: bigint, total: bigint): number =>
  total === 0n ? 0 : Math.min(100, Math.round(Number((part * 100n) / total)));

export const shortHex = (value: string, head = 8, tail = 6): string =>
  value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;

export const plural = (n: bigint | number, word: string): string =>
  `${n.toString()} ${word}${n === 1n || n === 1 ? '' : 's'}`;

/**
 * The poll's current stage. Rendered as a ruled band rather than a pill: it is a status
 * line on a form, not a badge, and the colour dot carries the state.
 */
export const StatusChip: React.FC<{ icon: React.ReactElement; label: string; color: string }> = ({
  icon,
  label,
  color,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      mb: 2,
      pb: 1.25,
      borderBottom: `1px solid ${tokens.rule}`,
      color,
      '& .MuiSvgIcon-root': { fontSize: 16 },
    }}
  >
    {icon}
    <Typography sx={{ ...microLabelSx, color, letterSpacing: '0.08em' }}>{label}</Typography>
  </Box>
);

export const Question: React.FC<{ text: string | undefined }> = ({ text }) => (
  <Typography
    variant="h5"
    sx={{ fontSize: { xs: '1.15rem', md: '1.3rem' }, lineHeight: 1.35, mb: 1.5, wordBreak: 'break-word' }}
  >
    {text ?? 'Loading question…'}
  </Typography>
);

export const Caption: React.FC<React.PropsWithChildren<{ color?: string; mb?: number }>> = ({
  children,
  color = tokens.inkMuted,
  mb = 1,
}) => (
  <Typography variant="caption" component="p" sx={{ color, display: 'block', mb, lineHeight: 1.6, fontSize: 12 }}>
    {children}
  </Typography>
);

/** Section heading inside a card. */
export const SectionLabel: React.FC<React.PropsWithChildren<{ mb?: number }>> = ({ children, mb = 1 }) => (
  <Typography component="p" sx={{ ...microLabelSx, mb }}>
    {children}
  </Typography>
);

export const Meter: React.FC<{ value: number; color?: string }> = ({ value, color = tokens.ink }) => (
  <LinearProgress
    variant="determinate"
    value={value}
    sx={{
      height: 8,
      borderRadius: 0,
      mb: 1,
      backgroundColor: tokens.sunken,
      '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 0 },
    }}
  />
);

export const Notice: React.FC<React.PropsWithChildren<{ severity?: AlertColor }>> = ({
  severity = 'info',
  children,
}) => (
  <Alert
    severity={severity}
    variant="outlined"
    sx={{ mb: 2, py: 0, fontSize: 12, backgroundColor: tokens.surface, '& .MuiAlert-message': { lineHeight: 1.6 } }}
  >
    {children}
  </Alert>
);

export const VoteBar: React.FC<{
  label: string;
  icon: React.ReactNode;
  count: bigint;
  total: bigint;
  color: string;
}> = ({ label, icon, count, total, color }) => {
  const percentage = pct(count, total);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'baseline' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {icon}
          <Typography variant="caption" sx={{ color: tokens.inkSecondary, fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: tokens.inkSecondary, fontFamily: mono, fontSize: 11 }}>
          {count.toString()} · {percentage}%
        </Typography>
      </Box>
      <Meter value={percentage} color={color} />
    </Box>
  );
};

/** A transaction hash, linked to the explorer when one is configured. */
export const TxLink: React.FC<{ txHash: string }> = ({ txHash }) => {
  const url = explorerTxUrl(txHash);
  const text = shortHex(txHash, 10, 8);
  return url ? (
    <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ fontFamily: mono, color: tokens.info }}>
      {text}
    </Link>
  ) : (
    <Box component="span" sx={{ fontFamily: mono }} title={txHash}>
      {text}
    </Box>
  );
};

export const actionButtonSx = { textTransform: 'none', fontWeight: 600 } as const;
