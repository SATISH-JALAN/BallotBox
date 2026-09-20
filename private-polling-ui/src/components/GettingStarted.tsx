import React, { useEffect, useState } from 'react';
import { Box, Button, Collapse, Link, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { LINKS } from '../config/product';
import { tokens } from '../config/theme';

const DISMISS_KEY = 'ballotbox:v1:getting-started-collapsed';

const readCollapsed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const Step: React.FC<React.PropsWithChildren<{ n: number; title: string; done?: boolean }>> = ({
  n,
  title,
  done,
  children,
}) => (
  <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
    {done ? (
      <CheckCircleIcon sx={{ color: tokens.affirm, fontSize: 20, mt: '2px' }} />
    ) : (
      <RadioButtonUncheckedIcon sx={{ color: tokens.inkFaint, fontSize: 20, mt: '2px' }} />
    )}
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.ink }}>
        {n}. {title}
      </Typography>
      <Typography variant="caption" component="div" sx={{ color: tokens.inkMuted, lineHeight: 1.6 }}>
        {children}
      </Typography>
    </Box>
  </Box>
);

/**
 * First-run checklist. Most first-time failures are setup, not product: no wallet, no
 * tNIGHT, no DUST, or no prover. Saying so up front saves a confusing error later.
 */
export const GettingStarted: React.FC = () => {
  const [open, setOpen] = useState(() => !readCollapsed());
  const [walletDetected, setWalletDetected] = useState(false);

  useEffect(() => {
    const check = () => setWalletDetected(!!window.midnight && Object.keys(window.midnight).length > 0);
    check();
    const timer = setInterval(check, 1_000);
    const stop = setTimeout(() => clearInterval(timer), 10_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, []);

  const toggle = () => {
    setOpen((was) => {
      try {
        window.localStorage.setItem(DISMISS_KEY, was ? '1' : '0');
      } catch {
        // preference is a convenience only
      }
      return !was;
    });
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 460 },
        border: `1px solid ${tokens.rule}`,
        borderRadius: 2,
        backgroundColor: tokens.surface,
        px: 3,
        py: 2,
      }}
    >
      <Button
        onClick={toggle}
        fullWidth
        endIcon={<ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
        sx={{ justifyContent: 'space-between', textTransform: 'none', color: tokens.ink, fontWeight: 700, px: 0 }}
      >
        New here? Get set up in about 5 minutes
      </Button>
      <Collapse in={open}>
        <Box sx={{ pt: 2 }}>
          <Step n={1} title="Install a Midnight wallet" done={walletDetected}>
            {walletDetected ? (
              'Wallet detected in this browser.'
            ) : (
              <>
                <Link href={LINKS.laceWallet} target="_blank" rel="noopener noreferrer">
                  Lace (Midnight)
                </Link>{' '}
                or{' '}
                <Link href={LINKS.oneAmWallet} target="_blank" rel="noopener noreferrer">
                  1AM
                </Link>{' '}
                for Chrome. Create a wallet and switch it to the <b>Preprod</b> network, then reload this page.
              </>
            )}
          </Step>
          <Step n={2} title="Get free test tokens">
            Copy your unshielded address from the wallet and request tNIGHT from the{' '}
            <Link href={LINKS.faucet} target="_blank" rel="noopener noreferrer">
              Preprod faucet
            </Link>
            . In the wallet, generate DUST from your tNIGHT — DUST pays transaction fees and takes a few minutes to
            appear.
          </Step>
          <Step n={3} title="Choose a proof server">
            Your wallet builds zero-knowledge proofs through a proof server. Use the hosted option in wallet settings if
            offered, or run one locally with Docker:{' '}
            <Box component="code" sx={{ fontSize: 11, color: tokens.ink }}>
              docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 midnight-proof-server -v
            </Box>
          </Step>
          <Step n={4} title="Join, vote, check in">
            Open the featured poll, press <b>Join this poll</b>, cast your ballot, and tap <b>Count me as a tester</b>.
            Then tell us how it went. Full walkthrough in the{' '}
            <Link href={LINKS.userGuide} target="_blank" rel="noopener noreferrer">
              user guide
            </Link>
            .
          </Step>
        </Box>
      </Collapse>
    </Box>
  );
};
