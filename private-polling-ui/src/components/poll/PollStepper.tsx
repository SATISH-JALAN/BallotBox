import React from 'react';
import { Step, StepLabel, Stepper } from '@mui/material';
import { PollState } from '../../../../contract/src/managed/private-polling/contract/index.js';
import { type PrivatePollingDerivedState } from '../../../../api/src/index';
import { tokens } from '../../config/theme';

const STEPS = ['Enrol', 'Vote', 'Decrypt', 'Result'] as const;

const activeStep = (state: PrivatePollingDerivedState): number => {
  switch (state.pollState) {
    case PollState.REGISTRATION:
      return 0;
    case PollState.OPEN:
      return 1;
    case PollState.TALLYING:
      return 2;
    default:
      return state.tallied ? 4 : -1;
  }
};

/** Where the poll is in its lifecycle, so nobody has to infer it from which buttons show. */
export const PollStepper: React.FC<{ state: PrivatePollingDerivedState }> = ({ state }) => {
  const step = activeStep(state);
  if (step < 0) return null;
  return (
    <Stepper
      activeStep={step}
      alternativeLabel
      sx={{
        mb: 2.5,
        '& .MuiStepLabel-label': { fontSize: 11, color: tokens.inkMuted, mt: '4px !important' },
        '& .MuiStepLabel-label.Mui-active, & .MuiStepLabel-label.Mui-completed': { color: tokens.ink },
        '& .MuiStepIcon-root': { color: tokens.sunken },
        '& .MuiStepIcon-text': { fill: tokens.inkSecondary, fontSize: 11, fontWeight: 600 },
        '& .MuiStepIcon-root.Mui-active': { color: tokens.ink },
        '& .MuiStepIcon-root.Mui-completed': { color: tokens.affirm },
      }}
    >
      {STEPS.map((label) => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};
