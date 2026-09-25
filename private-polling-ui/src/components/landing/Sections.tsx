import React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { LINKS } from '../../config/product';
import { microLabelSx, tokens } from '../../config/theme';
import { Section } from './Section';

// ─── Features ────────────────────────────────────────────────────────────────

const FEATURES: ReadonlyArray<{ icon: React.ReactNode; title: string; desc: string }> = [
  {
    icon: <LockOutlinedIcon />,
    title: 'Secret ballots',
    desc: 'Your choice is encrypted in your browser before it is sent. Nobody can read an individual ballot, including the organizer.',
  },
  {
    icon: <VisibilityOffOutlinedIcon />,
    title: 'Anonymous eligibility',
    desc: 'A zero-knowledge proof shows you are on the voter roll without revealing which voter you are.',
  },
  {
    icon: <VerifiedOutlinedIcon />,
    title: 'Verified results',
    desc: 'The published counts are re-encrypted and checked on-chain against the ballots. Anyone can re-verify.',
  },
  {
    icon: <KeyOutlinedIcon />,
    title: 'No single party can decrypt',
    desc: 'Every trustee must contribute a share before the total opens, and only the total is ever opened.',
  },
  {
    icon: <ReplayOutlinedIcon />,
    title: 'Change your vote',
    desc: 'Re-voting replaces your earlier ballot, so a receipt you were pressured to show proves nothing.',
  },
  {
    icon: <TimerOutlinedIcon />,
    title: 'Deadlines and quorum',
    desc: 'Voting closes on an on-chain deadline, and a poll that misses quorum is flagged as non-binding.',
  },
  {
    icon: <LinkOutlinedIcon />,
    title: 'Open or invite-only',
    desc: 'Share one link. Public polls let people join with a click; binding votes use an organizer-managed roll.',
  },
  {
    icon: <BackupOutlinedIcon />,
    title: 'Key backup and restore',
    desc: 'Your poll key survives reloads, and can be exported or restored on another device.',
  },
];

export const Features: React.FC = () => (
  <Section
    id="features"
    testId="features"
    eyebrow="Features"
    title="Everything a private vote needs, and nothing to trust"
    intro="BallotBox runs on Midnight, where contracts can compute over private data. Privacy and verifiability come from the protocol, not from a promise."
  >
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
      }}
    >
      {FEATURES.map(({ icon, title, desc }) => (
        <Box
          key={title}
          sx={{
            p: 3,
            border: `1px solid ${tokens.rule}`,
            borderRadius: 2,
            backgroundColor: tokens.surface,
            transition: 'border-color 0.15s, transform 0.15s',
            '&:hover': { borderColor: tokens.ruleStrong, transform: 'translateY(-2px)' },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: tokens.sunken,
              color: tokens.ink,
              mb: 2,
              '& svg': { fontSize: 21 },
            }}
          >
            {icon}
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.75 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.inkMuted, lineHeight: 1.65 }}>
            {desc}
          </Typography>
        </Box>
      ))}
    </Box>
  </Section>
);

// ─── How it works ────────────────────────────────────────────────────────────

const STEPS: ReadonlyArray<{ title: string; desc: string }> = [
  {
    title: 'Create',
    desc: 'An organizer starts a poll with a question, a deadline and a quorum, then shares one link.',
  },
  {
    title: 'Join',
    desc: 'Voters enrol with one click (or the organizer adds them). Trustees register their key shares.',
  },
  { title: 'Vote', desc: 'Each voter casts an encrypted ballot with a zero-knowledge proof. Re-voting replaces it.' },
  { title: 'Verify', desc: 'Trustees decrypt only the total, and the contract checks the published counts on-chain.' },
];

export const HowItWorks: React.FC = () => (
  <Section
    id="how-it-works"
    testId="how-it-works"
    tone="surface"
    eyebrow="How it works"
    title="From question to verified result in four steps"
  >
    <Box
      component="ol"
      sx={{
        listStyle: 'none',
        p: 0,
        m: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: { xs: 3, md: 0 },
      }}
    >
      {STEPS.map(({ title, desc }, i) => (
        <Box component="li" key={title} sx={{ pr: { md: 4 }, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: tokens.ink,
                color: tokens.surface,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {i + 1}
            </Box>
            {i < STEPS.length - 1 && (
              <Box
                sx={{
                  display: { xs: 'none', md: 'block' },
                  flex: 1,
                  height: '1px',
                  backgroundColor: tokens.ruleStrong,
                  ml: 2,
                }}
              />
            )}
          </Box>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.inkMuted, lineHeight: 1.65 }}>
            {desc}
          </Typography>
        </Box>
      ))}
    </Box>
  </Section>
);

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Can the organizer see my vote?',
    a: "No. Ballots are encrypted to a key that needs every trustee's share, and even then only the total is opened. Individual ballots are never decrypted.",
  },
  {
    q: 'Can someone see that I voted?',
    a: 'Anyone can see how many ballots were cast, but not which enrolled voter cast one. Someone watching your internet connection could see that you sent a transaction; use a VPN or Tor if that matters to you.',
  },
  {
    q: 'Why does voting take a minute or two?',
    a: 'Your browser and proof server build a zero-knowledge proof that you are eligible and that your encrypted ballot is valid, without revealing either. That work is what keeps the vote private.',
  },
  {
    q: 'What do I need to get started?',
    a: 'A Midnight wallet (Lace or 1AM) on Preprod, free tNIGHT from the faucet to generate DUST for fees, and a proof server — hosted in your wallet settings or run locally with Docker.',
  },
  {
    q: 'Does checking in as a tester link my wallet to my vote?',
    a: 'No. The tester list is a separate on-chain set. No voting step reads or writes it, and it stores your wallet key, not anything derived from your ballot credential.',
  },
  {
    q: 'I cleared my browser and lost my role. What now?',
    a: 'Restore your key backup with the key button on the poll. Without a backup, a new key is created and the old role cannot be recovered.',
  },
];

export const Faq: React.FC = () => (
  <Section id="faq" testId="faq" eyebrow="FAQ" title="Questions people ask first">
    <Box sx={{ maxWidth: 820 }}>
      {FAQS.map(({ q, a }) => (
        <Accordion
          key={q}
          disableGutters
          square
          sx={{
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${tokens.rule}`,
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, py: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {q}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
            <Typography variant="body2" sx={{ color: tokens.inkSecondary, lineHeight: 1.7 }}>
              {a}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  </Section>
);

// ─── Closing call to action ──────────────────────────────────────────────────

export const CtaBand: React.FC<{ readonly primaryLabel: string; readonly onPrimary: () => void }> = ({
  primaryLabel,
  onPrimary,
}) => (
  <Box component="section" data-testid="cta" sx={{ px: { xs: 2.5, md: 5 }, pb: { xs: 7, md: 11 } }}>
    <Box
      sx={{
        maxWidth: 1180 - 80,
        mx: 'auto',
        backgroundColor: tokens.ink,
        borderRadius: 3,
        px: { xs: 3, md: 7 },
        py: { xs: 5, md: 7 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        gap: 3,
      }}
    >
      <Box sx={{ maxWidth: 560 }}>
        <Typography sx={{ ...microLabelSx, color: tokens.inkFaint, mb: 1.5 }}>Try it in five minutes</Typography>
        <Typography
          variant="h3"
          component="h2"
          sx={{ color: tokens.surface, fontSize: { xs: '1.8rem', md: '2.3rem' }, lineHeight: 1.12 }}
        >
          Cast a private ballot on Midnight today.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={onPrimary}
          sx={{
            px: 3,
            py: 1.4,
            backgroundColor: tokens.surface,
            color: tokens.ink,
            '&:hover': { backgroundColor: '#fff' },
          }}
        >
          {primaryLabel}
        </Button>
        <Button
          variant="outlined"
          size="large"
          href={LINKS.userGuide}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            px: 3,
            py: 1.4,
            color: tokens.surface,
            borderColor: tokens.inkMuted,
            '&:hover': { borderColor: tokens.surface },
          }}
        >
          Read the guide
        </Button>
      </Box>
    </Box>
  </Box>
);
