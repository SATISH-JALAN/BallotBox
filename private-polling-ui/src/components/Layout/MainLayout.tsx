import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import { Header } from './Header';
import { BrandMark } from './BrandMark';
import { LINKS, NETWORK_ID, PRODUCT } from '../../config/product';
import { microLabelSx, tokens } from '../../config/theme';

const FooterLink: React.FC<React.PropsWithChildren<{ href: string; external?: boolean }>> = ({
  href,
  external = true,
  children,
}) => (
  <Link
    href={href}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    underline="hover"
    sx={{ display: 'block', fontSize: 14, color: tokens.inkMuted, mb: 1.25, '&:hover': { color: tokens.ink } }}
  >
    {children}
  </Link>
);

const FooterColumn: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <Box>
    <Typography sx={{ ...microLabelSx, color: tokens.ink, mb: 2 }}>{title}</Typography>
    {children}
  </Box>
);

const Footer: React.FC = () => (
  <Box component="footer" sx={{ borderTop: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface }}>
    <Box
      sx={{
        maxWidth: 1180,
        mx: 'auto',
        px: { xs: 2.5, md: 5 },
        pt: { xs: 6, md: 8 },
        pb: 4,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1fr 1fr' },
        gap: 4,
      }}
    >
      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, maxWidth: 320 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <BrandMark />
          <Typography variant="h6" sx={{ lineHeight: 1 }}>
            {PRODUCT.name}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: tokens.inkMuted, lineHeight: 1.65 }}>
          {PRODUCT.tagline}. Anonymous ballots, public arithmetic.
        </Typography>
      </Box>
      <FooterColumn title="Product">
        <FooterLink href="#features" external={false}>
          Features
        </FooterLink>
        <FooterLink href="#how-it-works" external={false}>
          How it works
        </FooterLink>
        <FooterLink href="#app" external={false}>
          Live poll
        </FooterLink>
        <FooterLink href="#faq" external={false}>
          FAQ
        </FooterLink>
      </FooterColumn>
      <FooterColumn title="Resources">
        <FooterLink href={LINKS.userGuide}>User guide</FooterLink>
        <FooterLink href={`${LINKS.github}/blob/main/PRIVACY.md`}>Privacy model</FooterLink>
        <FooterLink href={`${LINKS.github}/blob/main/docs/ARCHITECTURE.md`}>Architecture</FooterLink>
        {LINKS.feedbackForm && <FooterLink href={LINKS.feedbackForm}>Give feedback</FooterLink>}
      </FooterColumn>
      <FooterColumn title="Community">
        <FooterLink href={LINKS.github}>GitHub</FooterLink>
        {LINKS.x && <FooterLink href={LINKS.x}>X</FooterLink>}
        <FooterLink href={LINKS.midnight}>Midnight</FooterLink>
      </FooterColumn>
    </Box>
    <Box
      sx={{
        maxWidth: 1180,
        mx: 'auto',
        px: { xs: 2.5, md: 5 },
        py: 3,
        borderTop: `1px solid ${tokens.rule}`,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 1,
      }}
    >
      <Typography variant="caption" sx={{ color: tokens.inkMuted }}>
        © {new Date().getFullYear()} {PRODUCT.name} · Apache-2.0 · Built on Midnight
      </Typography>
      <Typography variant="caption" sx={{ color: tokens.inkMuted }}>
        Network: {NETWORK_ID}
      </Typography>
    </Box>
  </Box>
);

/** Page shell: sticky header, the landing sections and app passed in as children, footer. */
export const MainLayout: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Box id="top" sx={{ minHeight: '100vh', backgroundColor: tokens.paper, display: 'flex', flexDirection: 'column' }}>
    <Header />
    <Box component="main" sx={{ flex: 1 }}>
      {children}
    </Box>
    <Footer />
  </Box>
);
