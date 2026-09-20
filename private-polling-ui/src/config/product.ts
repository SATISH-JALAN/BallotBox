/**
 * Product identity and outbound links, in one place.
 *
 * Links come from build-time env so a fork (or a rename) needs no code change. An unset
 * link hides its UI rather than rendering a dead or placeholder URL.
 */

const optional = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const PRODUCT = {
  name: 'BallotBox',
  tagline: 'Private polls on Midnight',
  description:
    'Anonymous, verifiable polls. Your ballot is encrypted, your eligibility is proven in zero knowledge, and the result is checked on-chain.',
} as const;

export const NETWORK_ID: string = import.meta.env.VITE_NETWORK_ID || 'preprod';

/** The featured public poll the landing page points people at. */
export const FEATURED_CONTRACT_ADDRESS = optional(import.meta.env.VITE_CONTRACT_ADDRESS);

export const LINKS = {
  github: optional(import.meta.env.VITE_GITHUB_URL) ?? 'https://github.com/SATISH-JALAN/private-pooling',
  x: optional(import.meta.env.VITE_X_URL),
  feedbackForm: optional(import.meta.env.VITE_FEEDBACK_URL),
  userGuide:
    optional(import.meta.env.VITE_USER_GUIDE_URL) ??
    'https://github.com/SATISH-JALAN/private-pooling/blob/main/docs/USER_GUIDE.md',
  /** e.g. https://explorer.example/tx/{tx} — `{tx}` is replaced with the transaction hash. */
  explorerTx: optional(import.meta.env.VITE_EXPLORER_TX_URL),
  faucet: 'https://faucet.preprod.midnight.network/',
  laceWallet: 'https://chromewebstore.google.com/detail/lace-midnight-preview/hgeekaiplokcnmakghbdfbgnlfheichg',
  oneAmWallet: 'https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp',
  midnight: 'https://midnight.network',
} as const;

export const explorerTxUrl = (txHash: string): string | undefined =>
  LINKS.explorerTx ? LINKS.explorerTx.replace('{tx}', encodeURIComponent(txHash)) : undefined;

/** Builds a shareable link that opens a specific poll. */
export const pollShareUrl = (contractAddress: string): string => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('poll', contractAddress);
  return url.toString();
};

/** The poll named in the URL (`?poll=`), if any. */
export const pollFromUrl = (): string | undefined => {
  try {
    return optional(new URLSearchParams(window.location.search).get('poll') ?? undefined);
  } catch {
    return undefined;
  }
};

/**
 * Optional poll setup carried in the URL (`?q=…&hours=…&quorum=…&open=0`), so an organizer
 * can be handed a link that opens the form ready to submit instead of retyping the setup.
 */
export const pollSetupFromUrl = (): { question: string; hours: string; quorum: string; openEnrollment: boolean } => {
  const empty = { question: '', hours: '', quorum: '', openEnrollment: true };
  try {
    const params = new URLSearchParams(window.location.search);
    const digits = (name: string): string => {
      const value = optional(params.get(name) ?? undefined);
      return value && /^\d+$/.test(value) ? value : '';
    };
    return {
      question: (optional(params.get('q') ?? undefined) ?? '').slice(0, 280),
      hours: digits('hours'),
      quorum: digits('quorum'),
      openEnrollment: params.get('open') !== '0',
    };
  } catch {
    return empty;
  }
};
