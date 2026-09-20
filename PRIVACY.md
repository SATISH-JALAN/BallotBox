# Privacy model & threat model

This document states exactly what BallotBox protects, what it does not, and why. It is
deliberately blunt. A voting system that overstates its guarantees is worse than one that
makes none, because people act on the claim.

Every guarantee below is pinned by a test in
[`contract/src/test/private-polling.test.ts`](./contract/src/test/private-polling.test.ts).
`CLOSED:` tests assert a fixed gap and `GAP (open):` tests assert one that still stands, so
neither a regression nor a silent change can pass unnoticed.

---

## 1. Summary

| Property | Status |
|---|---|
| Ballot secrecy (nobody reads an individual ballot) | ✅ |
| Anonymous eligibility (roll membership proven in ZK) | ✅ |
| One counted ballot per credential | ✅ |
| No single party can decrypt (n-of-n trustees) | ✅ |
| Verified result (counts proven against ciphertexts) | ✅ |
| Receipt-freeness against coercion (re-voting) | ✅ with a residual leak, see §4 |
| Cross-poll unlinkability of a voter | ✅ (fixed in v3) |
| Sybil resistance | ✅ invite-only polls · ❌ open-enrollment polls, by design |
| Network-level anonymity | ❌ out of scope, see §6 |

## 2. What is public

Anyone with the contract address and an indexer can read these.

| Value | Ledger field | Notes |
|---|---|---|
| Contract admin identity hash | `admin` | `H(sk, "0")`, never the key |
| Poll organizer identity hash | `owner` | same derivation as `admin` |
| Poll question, stage, deadline, quorum | `pollQuestion`, `pollState`, `votingDeadline`, `quorum` | |
| Whether self-enrollment is allowed | `openEnrollment` | |
| Poll identifier | `pollId` | `H(owner, previous pollId, "poll")`, fresh for every poll |
| Enrolled commitments | `enrolledCommitments`, `eligibility` | one-way hashes `H(sk, "voter")` |
| Per-voter current ballot ciphertext | `priorBallotC1/C2`, keyed by nullifier | blinded by fresh randomness, unreadable |
| Encrypted aggregate | `encTallyC1/C2` | only the sum ever opens |
| Turnout | `ballotCount` | how many voted, never how |
| Trustee public keys and decryption shares | `trusteeKeys`, `decryptionShares`, `combinedShares` | keyed by identity hash |
| Final counts, quorum flag | `finalYes/No/Abstain`, `quorumMet` | only after every trustee has contributed |
| Checked-in tester wallets | `participants` | **opt-in**, see §5 |
| That a given wallet sent *a* transaction to the contract | chain metadata | inherent to any public chain |

## 3. What is private

| Value | How it is protected |
|---|---|
| A voter's choice | Supplied as a **witness** and never a circuit argument, then encrypted as exponential ElGamal `(g^r, H^r·g^m)`. The circuit constrains it to 0–2 without revealing it |
| Which roll member cast a ballot | ZK Merkle membership: the proof reveals a valid root and a nullifier, never the leaf or path |
| Link between enrolment and ballot | The commitment `H(sk,"voter")` and nullifier `H(H(sk,pollId),"nullifier")` are domain-separated one-way hashes that can't be derived from each other without `sk` |
| Secret keys (voter, organizer, trustee) | Held in private state on the user's device and only ever proven about |
| Trustee secret shares `xᵢ` | Witness only. Shares are proven correct against `g^xᵢ` in-circuit |
| A staged ballot at rest | Kept in memory only for the duration of `castVote`, and never written to browser storage |

## 4. Threat model

| Adversary | Learn how you voted? | Why |
|---|---|---|
| Passive chain observer or indexer | **No** | Each ballot is blinded by its own randomness `r` |
| Poll organizer / contract admin | **No** | Holds at most one trustee share; cannot open even the aggregate alone |
| All trustees colluding | **No** | Together they open only the **sum**, never an individual ballot |
| Another voter | **No** | Same as any observer |
| A voter trying to vote twice | **Rejected** | Their second ballot replaces the first (same nullifier), so `ballotCount` doesn't move |
| Someone not on the roll | **Rejected** | `checkRoot` fails without a valid membership path |
| Replaying another member's path | **Rejected** | The path leaf must equal the caller's own commitment |
| An organizer publishing false counts | **Rejected** | `publishTally` re-encrypts the counts and compares them with the ciphertext |
| An organizer extending voting after seeing turnout | **Prevented** | The deadline is enforced on-chain, and anyone can close after it |
| An organizer sitting on the result | **Prevented** | Publishing is permissionless once the shares are in |
| Someone taking over a finished shared contract | **Rejected** | Only `admin` can start a poll (v3) |
| Linking the same voter across polls | **Prevented** | `pollId` is hash-chained per poll, so nullifiers differ per poll (v3) |

### Residual leaks

- **Re-vote observability.** When a voter overrides their ballot, their entry in
  `priorBallotC1` visibly changes. A coercer who says "vote X and don't change it" can check
  the second half of that instruction, but can't learn the new choice. Closing this would
  require every ballot transaction to look identical, including no-op re-encryptions.
  Pinned by `GAP (open)`.
- **Timing correlation on open polls.** If a wallet self-enrols and then votes moments
  later while few others are active, an observer may guess that the ballot came from that
  enrolment. Cryptographically the two are unlinkable. Waiting before voting, or voting
  while others are active, helps.
- **Turnout of one.** A published tally with a single ballot reveals that ballot. This is
  true of every voting system.

## 5. Open enrollment and participant check-in (v3)

**Open enrollment** is chosen per poll. On an open poll any wallet can call
`selfEnroll(commitment)` during REGISTRATION or OPEN, up to the deadline.

- *Secrecy is unaffected.* Self-enrolled voters get exactly the same ballot protection.
- *Sybil resistance is given up on purpose.* One person holding several keys can enrol
  several times. Use invite-only polls, where the organizer enrols known voters, for
  binding decisions.
- The roll is a `HistoricMerkleTree`, so enrollments arriving while ballots are being
  proven don't invalidate those proofs.

**Participant check-in** (`checkIn`) lets a wallet opt in to a public tester list, so real
usage can be verified on-chain.

- It stores the coin public key the wallet presented, in a set that **no voting circuit
  reads or writes** and that `createPoll` never resets.
- It shares no derivation with the voter commitment or the nullifier, so it doesn't link a
  wallet to a ballot. Pinned by `CLOSED: checking in is unconnected to any ballot`.
- It does publish that the wallet used BallotBox. That's why it's opt-in and explained in
  the UI before the user is asked.
- `ownPublicKey()` is supplied by the caller's client. The list proves that a wallet chose
  to be counted, not that it holds funds.

## 6. Out of scope

- **Network-level deanonymisation.** Traffic correlation can link you to a transaction.
  Use Tor or a VPN when that matters.
- **Endpoint compromise.** Malware or a malicious browser extension that reads
  `localStorage` or your key backup defeats everything here.
- **Remote provers.** A hosted proof server sees the circuit inputs, including your choice.
  For sensitive votes run the proof server locally (`npm run proof-server`).
- **Roll construction.** Whether the right people were enrolled is a governance question.
- **Coercion during enrolment.** Re-voting protects the ballot, not the credential.
- **Trustee liveness.** With n-of-n, one unavailable trustee blocks the result
  permanently. It's the same property that stops a subset colluding. Choose trustees
  accordingly, and have them back up their keys.

## 7. Key handling

- **Browser:** one 32-byte secret per contract, in `localStorage` under
  `ballotbox:v1:<network>:private-state:<contract>`. It survives reloads. Anything running on
  the page's origin can read it, which is the usual trade-off of a serverless dApp.
- **Backup:** `ballotbox-key-backup/v1` JSON, exported and imported from the 🔑 button.
  Anyone holding it can act as you on that poll.
- **CLI:** LevelDB private state encrypted with `PRIVATE_STATE_PASSWORD`. The deploy
  script writes the admin key to `private-polling-cli/.secrets/` (gitignored).
- **Wallet seeds** are read from the environment only and never committed. A seed that
  was committed in an earlier revision of this repository must be treated as compromised.

## 8. Reporting

If you find a way to link a voter to a ballot, forge eligibility, bypass a nullifier, or
publish a false tally, please report it privately as described in [`SECURITY.md`](./SECURITY.md).
