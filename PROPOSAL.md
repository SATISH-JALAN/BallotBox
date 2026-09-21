# Product Proposal — BallotBox

> Drafted from the design this repository implements. Read it once and correct anything
> that does not match how you would pitch it; it is your product, not the code's.

## What is the product, and who uses it?

BallotBox runs **anonymous, verifiable polls**. An organizer starts a poll, voters cast
encrypted ballots, and the result is published only when every trustee has contributed a
decryption share — after which anyone can re-derive the counts from public chain data and
confirm they match the encrypted ballots.

Who uses it:

- **DAOs and token communities** that want a vote nobody can buy, coerce or audit after the
  fact, without publishing a permanent record of who voted which way.
- **Clubs, co-ops and student unions** running elections where a spreadsheet owned by one
  person is the current state of the art.
- **Teams making a contested decision** where a public show of hands would produce
  deference to the loudest person in the room.

The organizer never gains the ability to read an individual ballot. That is the point: the
tool removes the need to trust whoever is running the vote.

## Why Midnight specifically?

A transparent chain forces a choice between two bad options: publish the ballots (no
secrecy) or publish only a result (no verifiability — you are trusting whoever counted).
Midnight removes the choice, because a Compact circuit can *check* a private fact and write
only the conclusion to the ledger:

- **Eligibility without identity.** A voter proves in zero knowledge that their credential
  is on a Merkle roll, so the chain learns a valid voter voted — never which one.
- **One ballot per voter, still anonymous.** A nullifier derived from the voter's secret
  and the poll id makes a second ballot detectable without linking it to the first voter.
- **Counting without reading.** Ballots are added homomorphically (exponential ElGamal on
  Jubjub), so the running total exists on-chain while every individual ballot stays sealed.
- **Published results that are checkable.** `publishTally` re-encrypts the claimed counts
  in-circuit and rejects anything that does not match the accumulated ciphertext, so the
  organizer cannot publish numbers of their choosing.

None of these work on a transparent chain without a trusted off-chain counter, which is the
thing being designed out.

## Data Model

| Data Point | Type | Disclosed To |
|---|---|---|
| Poll question, deadline, quorum, stage | Public ledger | Everyone |
| Voter roll (Merkle tree of commitments) | Public ledger | Everyone — commitments only, not identities |
| Encrypted running tally (`encTallyC1/C2`) | Public ledger | Everyone, but unreadable without every trustee |
| Ballot count and enrolled count | Public ledger | Everyone |
| Nullifier per cast ballot | Public ledger | Everyone — unlinkable to a voter |
| Final counts, once published | Public ledger | Everyone |
| Checked-in tester wallets | Public ledger | Everyone — voluntary, separate from ballots |
| **Voter secret key** | Private witness | No one; never leaves the browser |
| **Which roll entry is yours** (Merkle path) | Private witness | No one |
| **Vote choice** | Private witness | No one — encrypted before it leaves the browser |
| **Trustee secret share** | Private witness | No one; only the public share is submitted |

## Mainnet Feasibility

Realistic, with two caveats.

What is ready: the contract carries no funds, so a bug costs a poll rather than a treasury;
eligibility, counting and tally verification are enforced in-circuit and covered by 47
contract tests plus a 26-step end-to-end run against a real node; and proving costs are
modest (a vote proves in about 30–120 seconds in the browser).

What must be settled first:

1. **Trustee operations.** `n-of-n` decryption means one lost key blocks a result forever.
   A mainnet version wants `k-of-n` threshold decryption.
2. **Roll size.** The eligibility tree is depth 10 (1,024 voters). Larger electorates need
   a deeper tree and a re-benchmark of proving time.

Neither is research; both are scoped work. A mainnet launch should follow at least one
real, contested vote on Preprod with independent trustees.
