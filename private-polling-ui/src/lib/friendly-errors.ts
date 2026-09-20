/**
 * Turns SDK, wallet and contract errors into something a first-time user can act on.
 *
 * The raw message is always kept (appended) so a bug report still carries the real cause —
 * the friendly half says what to *do*, the raw half says what *happened*.
 */

type Rule = { readonly test: RegExp; readonly message: string };

const RULES: readonly Rule[] = [
  {
    test: /could not find (a )?midnight (lace )?wallet|extension installed/i,
    message: 'No Midnight wallet found. Install Lace (Midnight) or 1AM, then reload this page.',
  },
  {
    test: /failed to respond|extension enabled/i,
    message: 'Your wallet did not respond. Unlock it, make sure it is set to Preprod, then try again.',
  },
  {
    test: /not authori[sz]ed|rejected|denied|user cancel/i,
    message: 'The wallet request was declined. Approve the connection or transaction in your wallet to continue.',
  },
  {
    test: /failed to fetch|ECONNREFUSED|6300|proof server|prover/i,
    message:
      'Could not reach the proof server. Start it with "docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 midnight-proof-server -v", or pick a hosted prover in your wallet settings.',
  },
  {
    test: /insufficient|not enough|dust|balance/i,
    message:
      'Your wallet cannot pay the fee. Get tNIGHT from the Preprod faucet and wait a few minutes for DUST to generate.',
  },
  { test: /already enrolled/i, message: 'You are already enrolled in this poll — you can vote once it is open.' },
  { test: /already checked in/i, message: 'This wallet is already counted as a participant. Thank you!' },
  { test: /already registered as a trustee/i, message: 'You are already a trustee for this poll.' },
  { test: /share already submitted/i, message: 'You have already submitted your decryption share.' },
  {
    test: /only accepts voters enrolled by the organizer/i,
    message: 'This poll is invite-only. Send your enrolment commitment to the organizer instead.',
  },
  { test: /not an eligible voter|path does not match/i, message: 'You are not on this poll’s voter roll yet.' },
  { test: /deadline has passed/i, message: 'Voting on this poll has closed — the deadline has passed.' },
  { test: /only the contract admin/i, message: 'Only the wallet that deployed this contract can start a poll on it.' },
  { test: /only the (poll )?creator/i, message: 'Only the poll organizer can do that.' },
  {
    test: /decryption trustee must register/i,
    message: 'Register at least one decryption trustee before opening voting.',
  },
  {
    test: /not every trustee has submitted|cannot decrypt yet/i,
    message: 'Every trustee must submit a decryption share before the result can be published.',
  },
  { test: /no contract (deployed|found)/i, message: 'No poll exists at that address on this network.' },
];

/**
 * The SDK wraps wallet and node failures ("Unexpected error submitting scoped transaction")
 * and keeps the real reason in `cause`, so walk the chain rather than show only the wrapper.
 */
export const errorText = (error: unknown): string => {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current !== undefined && current !== null && depth < 5; depth++) {
    const message = current instanceof Error ? current.message : typeof current === 'string' ? current : '';
    if (message && !parts.some((p) => p.includes(message))) parts.push(message);
    current = current instanceof Error ? current.cause : undefined;
  }
  return parts.length > 0 ? parts.join(' ← ') : String(error);
};

export const friendlyError = (error: unknown): string => {
  console.error('[BallotBox]', error);
  const raw = errorText(error);
  const rule = RULES.find((r) => r.test.test(raw));
  if (!rule) return raw || 'Something went wrong. Please try again.';
  return rule.message === raw ? raw : `${rule.message} (${raw})`;
};
