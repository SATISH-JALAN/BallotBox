import React, { useEffect, useState } from 'react';
import { AppBar, Box, IconButton, Link, Tooltip, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import XIcon from '@mui/icons-material/X';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { WalletConnectButton } from '../WalletConnectButton';
import { BrandMark } from './BrandMark';
import { heroInk } from '../landing/Hero';
import { LINKS, NETWORK_ID, PRODUCT } from '../../config/product';
import { display, mono, tokens } from '../../config/theme';

const NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Live poll', href: '#app' },
];

/** True while the dark hero is still behind the header, so the header can switch to light-on-dark. */
const useOverHero = (): boolean => {
  const [over, setOver] = useState(true);
  useEffect(() => {
    const update = () => {
      const hero = document.querySelector('[data-testid="hero"]');
      setOver(hero ? hero.getBoundingClientRect().bottom > 80 : false);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return over;
};

/** Masthead — a floating glass bar: wordmark, section nav, network, outbound links, wallet. */
export const Header: React.FC = () => {
  const dark = useOverHero();
  const ink = dark ? heroInk.text : tokens.ink;
  const soft = dark ? heroInk.textSoft : tokens.inkMuted;
  const line = dark ? heroInk.line : tokens.rule;

  const iconLinkSx = {
    color: soft,
    '&:hover': { color: ink, backgroundColor: 'transparent' },
    display: { xs: 'none', sm: 'inline-flex' },
  } as const;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      data-testid="header"
      sx={{
        top: { xs: 10, md: 16 },
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 1120,
        zIndex: (theme) => theme.zIndex.appBar,
        backgroundColor: dark ? 'rgba(7, 9, 24, 0.38)' : `${tokens.surface}e0`,
        backdropFilter: 'saturate(1.4) blur(14px)',
        backgroundImage: 'none',
        border: `1px solid ${line}`,
        borderRadius: 999,
        boxShadow: dark ? 'none' : '0 6px 24px rgba(16, 19, 43, 0.06)',
        transition: 'background-color 0.35s, border-color 0.35s, box-shadow 0.35s',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        pl: { xs: 2, md: 3 },
        pr: { xs: 1, md: 1.25 },
        py: 1,
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        <Link href="#top" underline="none" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BrandMark inverted={dark} />
          <Typography
            sx={{
              fontFamily: display,
              fontStyle: 'italic',
              fontSize: 24,
              letterSpacing: '-0.01em',
              color: ink,
              lineHeight: 1,
              transition: 'color 0.35s',
            }}
          >
            {PRODUCT.name}.
          </Typography>
        </Link>
      </Box>

      <Box
        component="nav"
        aria-label="Sections"
        sx={{
          display: { xs: 'none', md: 'flex' },
          gap: 3.5,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {NAV.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            underline="none"
            sx={{
              fontFamily: mono,
              fontSize: 11.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: soft,
              transition: 'color 0.2s',
              '&:hover': { color: ink },
            }}
          >
            {label}
          </Link>
        ))}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Typography
          sx={{
            fontFamily: mono,
            fontSize: 10.5,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: dark ? '#a9b4ff' : tokens.caution,
            border: `1px solid ${line}`,
            borderRadius: 999,
            px: 1.25,
            py: 0.4,
            mr: 0.75,
            display: { xs: 'none', lg: 'block' },
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
        <Box
          sx={{
            ml: 0.75,
            // Pill-shape the wallet button to match the bar; lighten it while over the hero.
            '& .MuiButton-root': {
              borderRadius: 999,
              ...(dark && {
                color: heroInk.text,
                borderColor: heroInk.line,
                backgroundColor: 'rgba(238, 240, 255, 0.06)',
                '&:hover': { backgroundColor: 'rgba(238, 240, 255, 0.12)', borderColor: 'rgba(238, 240, 255, 0.3)' },
              }),
            },
          }}
        >
          <WalletConnectButton networkId={NETWORK_ID} />
        </Box>
      </Box>
    </AppBar>
  );
};
