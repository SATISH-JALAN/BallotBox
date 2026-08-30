# Privacy Model & Threat Model

This document states precisely what Private Polling protects today, what it does not, and
the design that closes the gap. It is deliberately blunt: a voting system that overstates
its guarantees is worse than one that has none, because people act on the claim.

**Status:** Eligibility, one-vote-per-credential, ballot secrecy, vote overriding, and
**threshold decryption** are all implemented and tested.

Individual choices are never disclosed. The aggregate is an ElGamal ciphertext under a
joint key that **no single party holds** — opening it requires a decryption share from
every registered trustee, so one honest holdout keeps the result sealed. Publishing is
permissionless once the shares are in, so the organizer cannot sit on an outcome they
dislike, and the published counts are verified on-chain against the ballots.

One residual leak remains, documented in §3: a coercer can observe *that* a voter
overrode, though not what they changed it to.

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
| Eligibility roll root | `eligibility` Merkle tree — the set of enrolled commitments |
| Enrolled voter count | `eligibility.firstFree()` |
| Ballot ciphertexts | `encTallyC1` / `encTallyC2` — the blinded aggregate; individual choices are *not* recoverable from it |
| Turnout | `ballotCount` — how many voted, never how they voted |
| Final counts | `finalYes` / `finalNo` / `finalAbstain`, and only once the organizer publishes |

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
| Passive chain observer | **No** | Each ballot is blinded by the voter's own ElGamal randomness |
| Indexer / RPC operator | **No** (but see below) | Same as any observer; they do see *that* you transacted |
| Poll creator | **No** | Holds only their own share; cannot open even the aggregate alone |
| All trustees colluding | **No** | Together they open the *aggregate* — never an individual ballot |
| Another voter | **No** | Same as any observer |
| Someone who wants to vote twice | **No — rejected** | Their nullifier is already in `spentNullifiers` |
| Someone not on the roll | **No — rejected** | `checkRoot` fails without a valid membership path |
| Someone replaying another member's path | **No — rejected** | The path is bound to the caller's own commitment |

### Specific consequences

- ~~**No ballot secrecy.**~~ **Fixed.** The choice is a witness, never a circuit argument,
  and is accumulated as an ElGamal ciphertext. The circuit still constrains it to a legal
  value, so secrecy does not let a voter smuggle in extra weight.
- ~~**No coercion resistance.**~~ **Largely fixed.** Re-voting replaces the earlier ballot,
  so only the last one counts and whatever a voter showed a briber proves nothing about the
  final result. **Residual leak:** the voter's entry in `priorBallotC1` visibly changes when
  they override, so a coercer demanding "vote X and do not re-vote" can verify the second
  half of that instruction. Closing it fully requires every ballot transaction to look
  identical — including a no-op — which this design does not yet do.
- ~~**No sybil resistance.**~~ **Fixed.** Each key spends a nullifier bound to the poll, so
  a second ballot from the same key is rejected. The tally now represents one-vote-per-key.
- ~~**No eligibility.**~~ **Fixed.** Voting requires a zero-knowledge proof of membership
  in the organizer's roll. The proof reveals that *a* member voted, never which one.
- ~~**Small-tally inference.**~~ **Fixed.** There are no per-choice counters during voting
  — only an encrypted aggregate — so a single ballot reveals nothing. Note the *final*
  published tally is still inherently revealing when turnout is 1; that is true of every
  voting system and is not something cryptography can remove.

Each of these is pinned by a test in
[`contract/src/test/private-polling.test.ts`](./contract/src/test/private-polling.test.ts)
under *"anonymous-ballot gaps — Level 4 scope"*, where `CLOSED:` marks a fixed gap and
`GAP (open):` one that still stands — so neither a regression nor a silent fix can pass
unnoticed.

---

## 4. Target design (Level 4+)

Four mechanisms, in dependency order:

### 4.1 Merkle eligibility — ✅ IMPLEMENTED
The organizer publishes a Merkle root of commitments to eligible voters. A voter proves in
zero knowledge that they know a secret whose commitment is a leaf under that root, without
revealing which leaf. The contract learns *"a legitimate member voted"* and nothing more.

Replaces: the missing eligibility check. **Shipped** — `eligibility: MerkleTree<10, Bytes<32>>`
(up to 1024 voters), an `enrollVoter` circuit gated to the creator during a REGISTRATION
phase, and an `eligibilityPath` witness. `castVote` binds the supplied path to the
caller's own commitment, so one member cannot replay another's path.

### 4.2 Nullifiers — ✅ IMPLEMENTED
Each ballot emits `nullifier = hash(voterSecret, pollId)` into a spent set; a repeat
nullifier is rejected. Because the nullifier is a one-way function of a secret the chain
never sees, it enforces one-vote-per-credential while remaining unlinkable both to the
voter's identity and to their allowlist leaf.

Replaces: the missing double-vote protection. **Shipped** — `spentNullifiers: Set<Bytes<32>>`
plus a `voteNullifier` circuit domain-separated from `derivedPublicKey`, with `pollId`
regenerated per poll so a nullifier cannot replay across polls.

### 4.3 Homomorphic tallying — ✅ IMPLEMENTED
Ballots are encrypted one-hot vectors. The contract aggregates ciphertexts and never
decrypts an individual ballot; only the final sum is opened. This removes `disclose(choice)`
from the vote path entirely and also fixes small-tally inference, since no per-ballot value
is ever public.

Replaces: `disclose(choice)` and the per-choice public counters. **Shipped** — exponential
ElGamal over Jubjub. Each ballot adds `(g^r, H^r · g^m)` to a running pair; the organizer
decrypts the aggregate off-chain and `publishTally` re-encrypts the submitted counts to
verify them, so a dishonest organizer cannot publish a result the ballots do not support.

### 4.4 Vote overriding — ✅ IMPLEMENTED
Secrecy from observers is not sufficient. A voter who knows their own encryption randomness
can *prove* to a briber how they voted. Allowing re-votes — where only the last ballot
counts and ciphertexts are indistinguishable — means a coercer cannot tell whether the vote
they dictated was later replaced. Receipts become worthless.

**Shipped** — `priorBallotC1` / `priorBallotC2` store each voter's current ciphertext by
nullifier. Re-voting subtracts the stored ballot from the aggregate (via scalar-mult by
`order - 1`, since Compact has no unary minus) and adds the new one, so `ballotCount`
counts distinct voters rather than transactions.

### 4.5 Threshold decryption — ✅ IMPLEMENTED

Each trustee registers a public key `g^(x_i)` before voting opens; the joint tally key is
their sum, so the matching secret `Σx_i` is never assembled anywhere. After voting closes
each trustee submits a share `x_i · C1`, and the circuit recomputes `g^(x_i)` from the same
witness to confirm it matches what they registered — the ZK circuit *is* the proof of
correct decryption, so no separate sigma protocol is needed.

This is **n-of-n**: every registered trustee must participate. That deliberately trades
liveness for the strongest confidentiality — a single honest trustee refusing to collude
keeps the result sealed forever. A `t`-of-`n` scheme via Shamir sharing would survive
absent trustees, at the cost of letting any `t` of them collude to decrypt early.

**Shipped** — `trusteeKeys`, `decryptionShares`, `combinedShares`, plus `registerTrustee`,
`closeVoting`, and `submitDecryptionShare` circuits. `publishTally` is permissionless and
requires `shareCount == trusteeCount`.

### Trust progression

| | Who can see one ballot? | Who can open the tally? |
|---|---|---|
| Before Level 4 | **Anyone** | n/a — counters were public |
| Level 4 | Nobody | Organizer (single key) |
| Today | Nobody | **No single party** — every trustee's share is required |

---

## 5. Out of scope

Honest boundaries on what this will *not* defend against, even when complete:

- **Network-level deanonymization.** If you submit a ballot over an observed connection, an
  adversary correlating traffic may link you to a transaction. Use Tor or a relay.
- **Endpoint compromise.** A device that leaks your secret key defeats every guarantee here.
- **Roll construction.** Who belongs on the eligibility list is a governance question. The
  contract enforces membership; it cannot tell you the roll was assembled fairly.
- **Coercion during enrollment.** Vote overriding defends the ballot, not the credential.
- **Trustee liveness.** n-of-n means one unavailable trustee blocks the result permanently.
  This is a deliberate trade: it is the same property that stops any subset colluding to
  decrypt. Choose trustees accordingly.
- **Trustee collusion.** If *every* trustee colludes they can open the aggregate — but
  still not any individual ballot, which stays blinded by its own voter's randomness.

---

## 6. Reporting

If you find a way to link a voter to a ballot, forge eligibility, or reuse a nullifier,
please open a security advisory rather than a public issue. See [`SECURITY.md`](./SECURITY.md).
