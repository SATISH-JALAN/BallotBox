# Privacy Model & Threat Model

This document states precisely what Private Polling protects today, what it does not, and
the design that closes the gap. It is deliberately blunt: a voting system that overstates
its guarantees is worse than one that has none, because people act on the claim.

**Status:** Double-voting is fixed (nullifiers, implemented and tested). Ballot secrecy and
eligibility are **not** yet implemented.

---

## 1. What is public today

Everything in this list is readable by anyone with the contract address and an indexer.

| Value | Where it becomes public |
|---|---|
| Poll question | `pollQuestion` ledger field, via `disclose(question)` in `createPoll` |
| Poll state (open/closed) | `pollState` ledger field |
| Vote tallies | `yesVotes` / `noVotes` / `abstainVotes` counters |
| Poll creator identity hash | `owner` ledger field, via `disclose(derivedPublicKey(...))` |
| Poll sequence number | `sequence` counter |
| Spent nullifiers | `spentNullifiers` set — one opaque hash per ballot cast |
| Poll identifier | `pollId` ledger field |
| **Each voter's choice** | **`castVote` calls `disclose(choice)` — it is a public transaction input** |

## 2. What is private today

| Value | How it is protected |
|---|---|
| Poll creator's secret key | Held in private state; only `persistentHash(sk, seq)` is ever disclosed |
| Voter's secret key | Held in private state; never read by `castVote` at all |

The creator-authentication path is genuine zero-knowledge: `closePoll` proves the caller
knows a secret key whose hash equals `owner`, without revealing the key. That part works.

---

## 3. Threat model — who can learn what

| Adversary | Can they learn how you voted? | Why |
|---|---|---|
| Passive chain observer | **Yes** | `choice` is a public input to the `castVote` transaction |
| Indexer / RPC operator | **Yes** | Same, plus they see the submitting connection |
| Poll creator | **Yes** | Same as any observer |
| Another voter | **Yes** | Same as any observer |
| Someone who wants to vote twice | **No — rejected** | Their nullifier is already in `spentNullifiers` |
| Someone not on any allowlist | n/a — **they can vote** | No eligibility check exists |

### Specific consequences

- **No ballot secrecy.** Vote choice is disclosed. Combined with transaction metadata
  (submitting address, timing, network-level observation), a voter is linkable to a choice.
- ~~**No sybil resistance.**~~ **Fixed.** Each key spends a nullifier bound to the poll, so
  a second ballot from the same key is rejected. The tally now represents one-vote-per-key.
- **No eligibility.** Anyone who learns the contract address can vote in the poll.
- **Small-tally inference.** Even if the choice were not disclosed, per-choice public
  counters leak: with one ballot cast, the counters identify that voter's choice exactly.

Each of these is pinned by a test in
[`contract/src/test/private-polling.test.ts`](./contract/src/test/private-polling.test.ts)
under *"anonymous-ballot gaps — Level 4 scope"*, where `CLOSED:` marks a fixed gap and
`GAP (open):` one that still stands — so neither a regression nor a silent fix can pass
unnoticed.

---

## 4. Target design (Level 4+)

Four mechanisms, in dependency order:

### 4.1 Merkle eligibility
The organizer publishes a Merkle root of commitments to eligible voters. A voter proves in
zero knowledge that they know a secret whose commitment is a leaf under that root, without
revealing which leaf. The contract learns *"a legitimate member voted"* and nothing more.

Replaces: the missing eligibility check.

### 4.2 Nullifiers — ✅ IMPLEMENTED
Each ballot emits `nullifier = hash(voterSecret, pollId)` into a spent set; a repeat
nullifier is rejected. Because the nullifier is a one-way function of a secret the chain
never sees, it enforces one-vote-per-credential while remaining unlinkable both to the
voter's identity and to their allowlist leaf.

Replaces: the missing double-vote protection. **Shipped** — `spentNullifiers: Set<Bytes<32>>`
plus a `voteNullifier` circuit domain-separated from `derivedPublicKey`, with `pollId`
regenerated per poll so a nullifier cannot replay across polls.

### 4.3 Homomorphic tallying
Ballots are encrypted one-hot vectors. The contract aggregates ciphertexts and never
decrypts an individual ballot; only the final sum is opened. This removes `disclose(choice)`
from the vote path entirely and also fixes small-tally inference, since no per-ballot value
is ever public.

Replaces: `disclose(choice)` and the per-choice public counters.

### 4.4 Vote overriding (coercion resistance)
Secrecy from observers is not sufficient. A voter who knows their own encryption randomness
can *prove* to a briber how they voted. Allowing re-votes — where only the last ballot
counts and ciphertexts are indistinguishable — means a coercer cannot tell whether the vote
they dictated was later replaced. Receipts become worthless.

Replaces: nothing today; this is a property the current design has no answer to at all.

### Trust progression

| | Who can see one ballot? | Who can open the tally? |
|---|---|---|
| Today | **Anyone** | n/a — counters already public |
| With 4.1–4.4 | Nobody | Organizer (single key) |
| With threshold decryption | Nobody | No single party |

---

## 5. Out of scope

Honest boundaries on what this will *not* defend against, even when complete:

- **Network-level deanonymization.** If you submit a ballot over an observed connection, an
  adversary correlating traffic may link you to a transaction. Use Tor or a relay.
- **Endpoint compromise.** A device that leaks your secret key defeats every guarantee here.
- **Roll construction.** Who belongs on the eligibility list is a governance question. The
  contract enforces membership; it cannot tell you the roll was assembled fairly.
- **Coercion during enrollment.** Vote overriding defends the ballot, not the credential.

---

## 6. Reporting

If you find a way to link a voter to a ballot, forge eligibility, or reuse a nullifier,
please open a security advisory rather than a public issue. See [`SECURITY.md`](./SECURITY.md).
