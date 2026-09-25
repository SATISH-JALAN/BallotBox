import React from 'react';
import { Box, Typography } from '@mui/material';
import { microLabelSx, tokens } from '../../config/theme';

/** Shared page width and gutters, so every band lines up with the header. */
export const containerSx = {
  maxWidth: 1180,
  width: '100%',
  mx: 'auto',
  px: { xs: 2.5, md: 5 },
} as const;

export interface SectionProps {
  readonly id?: string;
  readonly eyebrow?: string;
  readonly title?: string;
  readonly intro?: string;
  /** `surface` lifts a band off the page ground to separate it from its neighbours. */
  readonly tone?: 'paper' | 'surface';
  readonly testId?: string;
}

/** A full-width landing band with an optional eyebrow, headline and intro. */
export const Section: React.FC<React.PropsWithChildren<SectionProps>> = ({
  id,
  eyebrow,
  title,
  intro,
  tone = 'paper',
  testId,
  children,
}) => (
  <Box
    component="section"
    id={id}
    data-testid={testId}
    sx={{
      backgroundColor: tone === 'surface' ? tokens.surface : tokens.paper,
      borderTop: tone === 'surface' ? `1px solid ${tokens.rule}` : 'none',
      borderBottom: tone === 'surface' ? `1px solid ${tokens.rule}` : 'none',
      py: { xs: 7, md: 11 },
      // Anchor jumps land below the sticky header.
      scrollMarginTop: 96,
    }}
  >
    <Box sx={containerSx}>
      {(eyebrow || title || intro) && (
        <Box sx={{ maxWidth: 680, mb: { xs: 4, md: 6 } }}>
          {eyebrow && <Typography sx={{ ...microLabelSx, mb: 1.5 }}>{eyebrow}</Typography>}
          {title && (
            <Typography
              variant="h3"
              component="h2"
              sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, lineHeight: 1.12, mb: intro ? 2 : 0 }}
            >
              {title}
            </Typography>
          )}
          {intro && (
            <Typography variant="body1" sx={{ color: tokens.inkSecondary, lineHeight: 1.7 }}>
              {intro}
            </Typography>
          )}
        </Box>
      )}
      {children}
    </Box>
  </Box>
);
