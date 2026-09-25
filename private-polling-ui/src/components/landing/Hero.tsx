import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';
import CodeIcon from '@mui/icons-material/Code';
import { LINKS, NETWORK_ID, TRACTION } from '../../config/product';
import { display, mono, tokens } from '../../config/theme';

export interface HeroProps {
  /** Primary call to action: opens the featured or invited poll, or jumps to poll creation. */
  readonly primaryLabel: string;
  readonly onPrimary: () => void;
}

/** The hero is the one dark surface on the page: a night sky with indigo and aqua light drifting behind glass. */
export const heroInk = {
  ground: '#070918',
  text: '#eef0ff',
  textSoft: '#a8aed3',
  textFaint: '#6f7598',
  line: 'rgba(238, 240, 255, 0.14)',
} as const;

const drift = keyframes`
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  33%  { transform: translate3d(6%, -4%, 0) scale(1.08); }
  66%  { transform: translate3d(-5%, 5%, 0) scale(0.95); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(18px); filter: blur(6px); }
  to   { opacity: 1; transform: none; filter: none; }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(95, 227, 200, 0.45); }
  50%      { box-shadow: 0 0 0 5px rgba(95, 227, 200, 0); }
`;

/** Entrance: each line rises out of a blur, one after another. */
const enter = (step: number) => ({
  animation: `${rise} 1s cubic-bezier(0.2, 0.7, 0.2, 1) ${0.15 + step * 0.14}s both`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

const Blob: React.FC<{ color: string; size: string; top: string; left: string; duration: number; delay?: number }> = ({
  color,
  size,
  top,
  left,
  duration,
  delay = 0,
}) => (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      top,
      left,
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle at center, ${color} 0%, transparent 68%)`,
      filter: 'blur(40px)',
      opacity: 0.85,
      animation: `${drift} ${duration}s ease-in-out ${delay}s infinite`,
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }}
  />
);

/** Fine film grain, so the gradients read as light on a surface rather than a flat fill. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const pillSx = {
  borderRadius: 999,
  px: { xs: 3, sm: 4 },
  py: 1.6,
  fontFamily: mono,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
} as const;

/** Landing hero: full-bleed, centred, one promise and one next step. */
export const Hero: React.FC<HeroProps> = ({ primaryLabel, onPrimary }) => (
  <Box
    component="section"
    data-testid="hero"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      isolation: 'isolate',
      minHeight: { xs: 'min(92svh, 820px)', md: 'min(100svh, 980px)' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: heroInk.ground,
      color: heroInk.text,
    }}
  >
    {/* Light */}
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: -2 }}>
      <Blob color="#5b35c9" size="62vmax" top="18%" left="-18%" duration={26} />
      <Blob color="#2f3fd6" size="58vmax" top="-24%" left="30%" duration={32} delay={-8} />
      <Blob color="#1f7fb8" size="46vmax" top="34%" left="58%" duration={28} delay={-14} />
      <Blob color="#26206e" size="40vmax" top="-18%" left="-6%" duration={36} delay={-4} />
      <Blob color="#0f8a86" size="36vmax" top="62%" left="22%" duration={30} delay={-18} />
    </Box>
    {/* Vignette, then grain */}
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        backgroundImage: 'radial-gradient(ellipse at center, transparent 35%, rgba(3, 4, 12, 0.75) 100%)',
      }}
    />
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        backgroundImage: GRAIN,
        backgroundSize: '160px 160px',
        opacity: 0.07,
        mixBlendMode: 'soft-light',
      }}
    />

    <Box
      sx={{
        position: 'relative',
        textAlign: 'center',
        px: { xs: 2.5, md: 5 },
        pt: { xs: 14, md: 12 },
        pb: { xs: 10, md: 12 },
        maxWidth: 1100,
      }}
    >
      <Box
        sx={{
          ...enter(0),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2,
          py: 0.9,
          mb: { xs: 4, md: 5 },
          border: `1px solid ${heroInk.line}`,
          borderRadius: 999,
          backgroundColor: 'rgba(238, 240, 255, 0.05)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: '#5fe3c8',
            animation: `${pulse} 2.4s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        />
        <Typography
          component="span"
          sx={{
            fontFamily: mono,
            fontSize: 11.5,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: heroInk.textSoft,
          }}
        >
          Live on Midnight {NETWORK_ID === 'preprod' ? 'Preprod' : NETWORK_ID} · {TRACTION.testers} testers
        </Typography>
      </Box>

      <Typography
        component="h1"
        sx={{
          fontFamily: display,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: { xs: '3.4rem', sm: '5rem', md: '7rem', lg: '7.8rem' },
          lineHeight: 0.98,
          letterSpacing: '-0.025em',
          color: heroInk.text,
          mb: { xs: 4, md: 5 },
        }}
      >
        <Box component="span" sx={{ display: 'block', ...enter(1) }}>
          Vote privately.
        </Box>
        <Box
          component="span"
          sx={{
            display: 'block',
            ...enter(2),
            background: `linear-gradient(100deg, ${heroInk.text} 10%, #a9b4ff 55%, #7fe3d4 95%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            // Italic overhang would be clipped by background-clip without a little room.
            px: '0.08em',
            pb: '0.14em',
            mb: '-0.14em',
          }}
        >
          Verify publicly.
        </Box>
      </Typography>

      <Typography
        sx={{
          ...enter(3),
          fontFamily: mono,
          fontSize: { xs: 13.5, md: 15.5 },
          lineHeight: 1.85,
          color: heroInk.textSoft,
          maxWidth: 640,
          mx: 'auto',
          mb: { xs: 5, md: 6 },
        }}
      >
        Anonymous, verifiable polls on the Midnight Network.
        <br />
        Ballots are encrypted, eligibility is proven in zero knowledge, and every result is checked on-chain.
      </Typography>

      <Box sx={{ ...enter(4), display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
        <Button
          onClick={onPrimary}
          data-testid="hero-primary"
          sx={{
            ...pillSx,
            color: heroInk.ground,
            backgroundColor: heroInk.text,
            '&:hover': { backgroundColor: '#fff', transform: 'translateY(-1px)' },
            transition: 'transform 0.2s, background-color 0.2s',
          }}
        >
          {primaryLabel}
        </Button>
        <Button
          href={LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<CodeIcon />}
          sx={{
            ...pillSx,
            color: heroInk.text,
            border: `1px solid ${heroInk.line}`,
            backgroundColor: 'rgba(238, 240, 255, 0.04)',
            backdropFilter: 'blur(8px)',
            '&:hover': { backgroundColor: 'rgba(238, 240, 255, 0.1)', borderColor: 'rgba(238, 240, 255, 0.3)' },
          }}
        >
          View on GitHub
        </Button>
      </Box>

      <Box
        sx={{
          ...enter(5),
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: { xs: 2, sm: 4 },
          rowGap: 1,
          mt: { xs: 6, md: 8 },
        }}
      >
        {['Encrypted ballots', 'Zero-knowledge eligibility', 'On-chain tally'].map((item) => (
          <Typography
            key={item}
            component="span"
            sx={{
              fontFamily: mono,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: heroInk.textFaint,
            }}
          >
            ✦ {item}
          </Typography>
        ))}
      </Box>
    </Box>

    {/* Soft hand-off into the paper page below. */}
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 1,
        backgroundColor: tokens.rule,
        opacity: 0.2,
      }}
    />
  </Box>
);
