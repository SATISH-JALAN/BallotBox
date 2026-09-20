# Private Polling v2 — Target Contract Design

Design for the Level 4 rewrite of [`src/private-polling.compact`](./src/private-polling.compact),
closing the three gaps recorded in [`../PRIVACY.md`](../PRIVACY.md).

> **Status: implemented and superseded (historical record).** Everything designed here
> shipped, plus vote overriding and threshold decryption, in a different concrete form
> (for example a `Map` keyed by nullifier instead of a `Set`, and ElGamal instead of an
> encrypted vector). Contract v3 then added a deployment-time admin, open enrollment on a
> `HistoricMerkleTree`, a hash-chained per-poll `pollId`, and participant check-in.
>
> For the current design see [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) and
> [`../PRIVACY.md`](../PRIVACY.md). The source of truth is
> [`src/private-polling.compact`](./src/private-polling.compact).

---

## Gap → mechanism

| Gap today | Mechanism | Section |
|---|---|---|
| `castVote` calls `disclose(choice)` | Undisclosed ballots | [§3](#3-undisclosed-ballots) |
| One key can vote unlimited times | Nullifier set | [§2](#2-nullifiers) |
| Anyone may vote | Merkle eligibility proof | [§1](#1-merkle-eligibility) |

---

## Ledger changes

```compact
// Root of the eligibility tree, published by the organizer at poll creation.
export ledger eligibilityRoot: Bytes<32>;

// Nullifiers already spent in this poll. Rejecting a repeat is what makes the
// ballot one-per-credential without identifying the credential.
export ledger spentNullifiers: Set<Bytes<32>>;

// Binds nullifiers to this specific poll, so a credential used in poll N cannot
// be replayed in poll N+1. Without this the whole scheme leaks across polls.
export ledger pollId: Bytes<32>;
```

`yesVotes` / `noVotes` / `abstainVotes` remain for now — see [§3](#3-undisclosed-ballots)
for why removing them is staged separately.

---

## 1. Merkle eligibility

The organizer builds a Merkle tree whose leaves are `commit(voterSecret)` for each eligible
voter, and publishes the root. A voter proves membership without revealing which leaf.

```compact
witness localSecretKey(): Bytes<32>;
// The voter's authentication path — private, supplied by the wallet, never disclosed.
witness merklePath(): MerkleTreePath<ELIGIBILITY_DEPTH, Bytes<32>>;

export circuit voterCommitment(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([sk, pad(32, "voter")]);
}
```

Inside `castVote`, before anything else:

```compact
const sk = localSecretKey();
const leaf = voterCommitment(sk);
// Recomputes the root from the private leaf + private path and checks it against
// the public root. Proves membership; reveals neither leaf nor path.
assert(merklePathRoot(merklePath(), leaf) == eligibilityRoot, "Not an eligible voter");
```

**Domain separation matters.** `voterCommitment` pads with `"voter"` so a commitment can
never collide with the `derivedPublicKey` hash used for creator authentication. Reusing one
hash for two purposes is how these schemes usually break.

**Open question:** the exact standard-library name and signature for the path-root helper
(`merklePathRoot` here) needs confirming against 0.31.0. Depth is fixed at compile time, so
`ELIGIBILITY_DEPTH` caps the roll size and directly drives proving cost — this is the main
performance knob.

## 2. Nullifiers

```compact
export circuit voteNullifier(sk: Bytes<32>, poll: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([sk, poll]);
}
```

In `castVote`, after the eligibility check:

```compact
const nullifier = disclose(voteNullifier(sk, pollId));
assert(!spentNullifiers.member(nullifier), "Already voted in this poll");
spentNullifiers.insert(nullifier);
```

The nullifier **is** disclosed — deliberately. That is safe and necessary: the contract must
compare it against the spent set, and it is a one-way hash of a secret the chain never sees,
so it is unlinkable to both the voter's identity and their tree leaf. What it does reveal is
that *some* eligible member has now voted, which is exactly the intended public fact.

Binding to `pollId` is what prevents cross-poll replay and cross-poll linkage of the same
voter.

## 3. Undisclosed ballots

This is the part that cannot be done by rearranging the current contract, and the reason it
is staged after §1–§2.

The problem: `castVote` currently branches on the choice and increments one of three public
counters. Even with `disclose()` removed, *which counter moved* leaks the choice — the
ledger write itself is the disclosure. Guarding each counter with a `0 or 1` increment does
not help either, because the increment amounts would still have to be derived from public
values to be checkable.

The fix is to stop storing per-choice counts during voting:

1. **During the poll**, each ballot contributes an encrypted one-hot vector. The contract
   aggregates ciphertexts into a running total without decrypting any individual ballot.
2. **At close**, the aggregate is opened once and the result proven correct against the
   accumulated ciphertext.

```compact
// Aggregate only. No per-ballot value is ever public.
export ledger encryptedTally: EncryptedVector<3>;
```

**This is the main technical unknown.** Whether Compact 0.31's ledger types can express
additively-homomorphic aggregation directly, or whether the accumulation has to be carried
in a commitment plus a closing proof, needs to be settled before committing to this shape.
**De-risking plan:** validate on a two-option ballot first; if native homomorphic
aggregation is not available, fall back to storing per-ballot commitments and proving the
tally at close, which is strictly more expensive but uses only primitives already known to
exist.

Until §3 lands, §1 and §2 are still worth shipping on their own: they deliver eligibility
and one-person-one-vote, which is already the difference between a demo and a usable poll.

## 4. Vote overriding — deferred

Coercion resistance (re-voting, last ballot counts, indistinguishable ciphertexts) depends
entirely on §3 being in place, since it requires ballots to be ciphertexts in the first
place. Recorded in [`../PRIVACY.md`](../PRIVACY.md) §4.4; not designed in detail here.

---

## Migration notes

- `createPoll` gains an `eligibilityRoot` parameter and must generate a `pollId`.
- `castVote` gains two witnesses (`merklePath`) and loses its `choice` disclosure.
- `PrivatePollingPrivateState` in [`src/witnesses.ts`](./src/witnesses.ts) gains the voter's
  Merkle path, which the wallet must obtain from the organizer at enrollment.
- The three "known limitations" tests in
  [`src/test/private-polling.test.ts`](./src/test/private-polling.test.ts) are expected to
  **fail** after this work — that is the acceptance signal. Rewrite them to assert the
  inverse: repeat votes rejected, unenrolled keys rejected, single ballots not identifiable.
- `api/src/common-types.ts` `PrivatePollingDerivedState` drops the per-choice counters in
  favour of a tally that only exists once the poll is closed.
