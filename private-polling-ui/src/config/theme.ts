import { createTheme } from '@mui/material';

/**
 * BallotBox design tokens.
 *
 * The product is a paper ballot that happens to be cryptographic, so the surface reads like
 * a printed form: warm paper, ink type, hairline rules, no gradients or glow. Colour is
 * reserved for meaning — affirm, against, caution, verified — so a coloured pixel always
 * says something. Components import these instead of hardcoding hex.
 */
export const tokens = {
  /** Page ground. */
  paper: '#f2efe8',
  /** Cards and dialogs sitting on the page. */
  surface: '#fbfaf6',
  /** Insets: code blocks, quiet panels, meter troughs. */
  sunken: '#e9e5da',
  /** Primary type, and the fill of primary buttons. */
  ink: '#1d1c18',
  inkSecondary: '#4f4c44',
  inkMuted: '#78736a',
  inkFaint: '#9b968a',
  /** Hairlines. Nothing in this UI needs a shadow. */
  rule: '#dcd6c8',
  ruleStrong: '#c3bcab',
  /** Meaningful colour only. */
  affirm: '#2f6b4b',
  against: '#a33f2c',
  neutral: '#857f73',
  caution: '#8a6012',
  info: '#2b5b80',
} as const;

const sans = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const serif = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';
export const mono = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Small uppercase label used to title a section without shouting. */
export const microLabelSx = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: tokens.inkMuted,
} as const;

export const theme = createTheme({
  typography: {
    fontFamily: sans,
    h1: { fontFamily: serif, fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: serif, fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontFamily: serif, fontWeight: 600, letterSpacing: '-0.02em' },
    h4: { fontFamily: serif, fontWeight: 600 },
    h5: { fontFamily: serif, fontWeight: 600 },
    h6: { fontWeight: 650, letterSpacing: '-0.01em' },
    button: { textTransform: 'none', fontWeight: 600 },
    allVariants: { color: tokens.ink },
  },
  shape: { borderRadius: 6 },
  palette: {
    mode: 'light',
    primary: { main: tokens.ink, contrastText: '#fbfaf6' },
    secondary: { main: tokens.inkMuted },
    background: { default: tokens.paper, paper: tokens.surface },
    success: { main: tokens.affirm },
    error: { main: tokens.against },
    warning: { main: tokens.caution },
    info: { main: tokens.info },
    divider: tokens.rule,
    text: { primary: tokens.ink, secondary: tokens.inkMuted },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${tokens.rule}`,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 4 },
        contained: {
          backgroundColor: tokens.ink,
          color: tokens.surface,
          '&:hover': { backgroundColor: '#000' },
          '&.Mui-disabled': { backgroundColor: tokens.sunken, color: tokens.inkFaint },
        },
        outlined: { borderColor: tokens.ruleStrong },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 4, fontWeight: 600 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          '& fieldset': { borderColor: tokens.rule },
          '&:hover fieldset': { borderColor: tokens.ruleStrong },
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 4 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: tokens.rule } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: tokens.ink, fontSize: 11, borderRadius: 4 },
        arrow: { color: tokens.ink },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.paper,
          scrollbarColor: `${tokens.ruleStrong} ${tokens.paper}`,
          '&::-webkit-scrollbar': { width: 10 },
          '&::-webkit-scrollbar-track': { background: tokens.paper },
          '&::-webkit-scrollbar-thumb': { background: tokens.ruleStrong, borderRadius: 5 },
        },
        '::selection': { background: '#dfd6bd' },
      },
    },
  },
});
