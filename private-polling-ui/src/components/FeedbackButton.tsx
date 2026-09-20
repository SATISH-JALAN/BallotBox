import React from 'react';
import { Fab, Tooltip } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import { LINKS } from '../config/product';
import { tokens } from '../config/theme';

/** Where feedback goes: the structured form if configured, otherwise a GitHub issue template. */
export const feedbackUrl = (): string => LINKS.feedbackForm ?? `${LINKS.github}/issues/new?template=user-feedback.yml`;

/** Always-visible entry point to the feedback loop. */
export const FeedbackButton: React.FC = () => (
  <Tooltip title="Tell us what worked and what didn't" placement="left">
    <Fab
      variant="extended"
      size="medium"
      component="a"
      href={feedbackUrl()}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="feedback-button"
      sx={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 1200,
        textTransform: 'none',
        fontWeight: 700,
        backgroundColor: tokens.ink,
        color: tokens.surface,
        '&:hover': { backgroundColor: '#000' },
      }}
    >
      <FeedbackIcon sx={{ mr: 1 }} />
      Feedback
    </Fab>
  </Tooltip>
);
