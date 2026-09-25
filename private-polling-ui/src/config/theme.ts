import { createTheme } from '@mui/material';

/**
 * BallotBox design tokens.
 *
 * Midnight night-sky palette: cool off-white ground, deep navy ink and hairline rules, with
 * the one dark, lit surface reserved for the hero. Colour is
 * reserved for meaning — affirm, against, caution, verified — so a coloured pixel always
 * says something. Components import these instead of hardcoding hex.
 */
export const tokens = {
  /** Page ground. */
  paper: '#f4f5fa',
  /** Cards and dialogs sitting on the page. */
  surface: '#fcfcff',
  /** Insets: code blocks, quiet panels, meter troughs. */
  sunken: '#e8eaf5',
  /** Primary type, and the fill of primary buttons. */
  ink: '#10132b',
  inkSecondary: '#3d4264',
  inkMuted: '#676c8f',
  inkFaint: '#9095b4',
  /** Hairlines. Nothing in this UI needs a shadow. */
  rule: '#dcdfee',
  ruleStrong: '#c1c5de',
  /** Meaningful colour only. */
  affirm: '#15795d',
  against: '#b3364a',
  neutral: '#7b8099',
  caution: '#8a5a0c',
  info: '#4148d6',
} as const;

const sans = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const serif = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';
/** Hero display face: a light italic serif, loaded from Google Fonts in index.html. */
export const display = '"Instrument Serif", "Iowan Old Style", "Palatino Linotype", Georgia, serif';
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
    primary: { main: tokens.ink, contrastText: '#fcfcff' },
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
          '&:hover': { backgroundColor: '#05061a' },
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
        '::selection': { background: '#d4d8fb' },
      },
    },
  },
});
