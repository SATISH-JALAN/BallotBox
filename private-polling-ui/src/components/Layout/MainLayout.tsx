import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import { Header } from './Header';
import { LINKS, PRODUCT } from '../../config/product';
import { microLabelSx, tokens } from '../../config/theme';

/**
 * The page is laid out like a printed ballot paper: a masthead, a ruled statement of what
 * the thing guarantees, then the form itself. Rules divide; nothing floats.
 */
const Guarantee: React.FC<{ index: string; title: string; desc: string }> = ({ index, title, desc }) => (
  <Box sx={{ flex: '1 1 240px', maxWidth: 320, px: { xs: 0, md: 3 }, py: { xs: 2, md: 0 } }}>
    <Typography sx={{ ...microLabelSx, color: tokens.inkFaint, mb: 1 }}>{index}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
      {title}
    </Typography>
    <Typography variant="caption" sx={{ color: tokens.inkMuted, lineHeight: 1.65, display: 'block' }}>
      {desc}
    </Typography>
  </Box>
);

const FooterLink: React.FC<React.PropsWithChildren<{ href: string }>> = ({ href, children }) => (
  <Link
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    underline="hover"
    sx={{ color: tokens.inkMuted, '&:hover': { color: tokens.ink } }}
  >
    {children}
  </Link>
);

export const MainLayout: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box sx={{ minHeight: '100vh', backgroundColor: tokens.paper, display: 'flex', flexDirection: 'column' }}>
    <Header />

    <Box
      sx={{
        maxWidth: 1180,
        width: '100%',
        mx: 'auto',
        px: { xs: 2.5, md: 5 },
        pt: { xs: 5, md: 8 },
        pb: { xs: 3, md: 4 },
      }}
    >
      <Typography sx={{ ...microLabelSx, mb: 2 }}>Anonymous ballots · public arithmetic</Typography>
      <Typography
        variant="h2"
        sx={{ fontSize: { xs: '2.1rem', md: '3.1rem' }, lineHeight: 1.08, maxWidth: 760, mb: 2 }}
      >
        Vote privately.
        <br />
        Verify publicly.
      </Typography>
      <Typography variant="body1" sx={{ color: tokens.inkSecondary, maxWidth: 560, lineHeight: 1.7 }}>
        {PRODUCT.description}
      </Typography>
    </Box>

    <Box
      sx={{
        maxWidth: 1180,
        width: '100%',
        mx: 'auto',
        px: { xs: 2.5, md: 5 },
        pb: { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          borderTop: `1px solid ${tokens.rule}`,
          borderBottom: `1px solid ${tokens.rule}`,
          py: { xs: 1, md: 3 },
          '& > div + div': { borderLeft: { md: `1px solid ${tokens.rule}` } },
        }}
      >
        <Guarantee
          index="01"
          title="Secret ballots"
          desc="Each ballot is encrypted before it leaves your browser. Nobody — including the organizer — can read it."
        />
        <Guarantee
          index="02"
          title="Anonymous eligibility"
          desc="A zero-knowledge proof shows you are on the roll without revealing which voter you are."
        />
        <Guarantee
          index="03"
          title="Verifiable results"
          desc="The published tally is checked on-chain against the encrypted ballots, and anyone can recheck it."
        />
      </Box>
    </Box>

    <Box
      sx={{
        flex: 1,
        maxWidth: 1180,
        width: '100%',
        mx: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 3,
        px: { xs: 2.5, md: 5 },
        pb: 10,
      }}
    >
      {children}
    </Box>

    <Box component="footer" sx={{ borderTop: `1px solid ${tokens.rule}`, py: 3, px: { xs: 2.5, md: 5 } }}>
      <Typography
        variant="caption"
        sx={{
          color: tokens.inkMuted,
          maxWidth: 1180,
          mx: 'auto',
          display: 'flex',
          gap: 2.5,
          flexWrap: 'wrap',
        }}
      >
        <span>
          {PRODUCT.name} · built on <FooterLink href={LINKS.midnight}>Midnight</FooterLink>
        </span>
        <FooterLink href={LINKS.userGuide}>User guide</FooterLink>
        <FooterLink href={`${LINKS.github}/blob/main/PRIVACY.md`}>Privacy model</FooterLink>
        <FooterLink href={LINKS.github}>GitHub</FooterLink>
        {LINKS.x && <FooterLink href={LINKS.x}>X</FooterLink>}
      </Typography>
    </Box>
  </Box>
);
