# Integrating BallotBox

`api/` is the integration surface. The web app and the CLI do everything through
`PrivatePollingAPI`, so a DAO tool, bot or custom frontend can do the same without
touching the contract directly.

## Providers

You supply standard Midnight providers (`MidnightProviders`):

| Provider | Browser | Node |
|---|---|---|
| `privateStateProvider` | persistent per-contract store (see `private-polling-ui/src/private-state/`) | `levelPrivateStateProvider` |
| `publicDataProvider` | `indexerPublicDataProvider(indexerUri, indexerWsUri)` | same |
| `zkConfigProvider` | `FetchZkConfigProvider(origin)`, serving `/keys` and `/zkir` | `NodeZkConfigProvider(managedDir)` |
| `proofProvider` | `httpClientProofProvider(proverUri, zkConfig)` | same |
| `walletProvider` / `midnightProvider` | DApp connector (`balanceUnsealedTransaction`, `submitTransaction`) | wallet SDK facade |

## Lifecycle

```ts
import { PrivatePollingAPI, VoteChoice } from '@midnight-ntwrk/private-polling-api';

// Organizer
const api = await PrivatePollingAPI.deploy(providers, logger);          // caller becomes admin
await api.createPoll('Adopt proposal 12?', {
  deadline: new Date(Date.now() + 7 * 86_400_000),
  quorum: 20,
  openEnrollment: true,
});
await api.registerTrustee();                                             // ≥1 trustee required
await api.openVoting();

// Voter (another wallet / browser)
const voter = await PrivatePollingAPI.join(providers, api.deployedContractAddress, logger);
await voter.selfEnroll();                                                // open polls
await voter.castVote(VoteChoice.Yes);                                    // re-callable; last one counts
await voter.checkIn();                                                   // optional, opt-in

// Close and publish
await api.closeVoting();
await api.submitDecryptionShare();                                       // every trustee
const result = await api.publishTally();                                 // anyone; { yes, no, abstain, txHash }
```

Every transaction method resolves to a `TxReceipt` (`{ txHash, blockHeight }`).

For invite-only polls, collect each voter's commitment
(`PrivatePollingAPI.voterCommitment(secretKey)`, or `state.myCommitment` in the UI) and call
`enrollVoter(commitmentBytes)` during REGISTRATION.

## State

`api.state$` emits `PrivatePollingDerivedState`, which combines the public ledger with this wallet's key:

| Field | Meaning |
|---|---|
| `pollState` | `CLOSED` · `REGISTRATION` · `OPEN` · `TALLYING` |
| `pollQuestion`, `votingDeadline` (unix s, 0 = none), `quorum`, `quorumMet` | poll settings and outcome flag |
| `openEnrollment` | whether `selfEnroll` is allowed |
| `isAdmin`, `isOwner` | whether this wallet can create polls / manage this poll |
| `enrolledCount`, `isEligible`, `myCommitment` | roll size, whether this wallet is on it, and its commitment (hex) |
| `ballotCount`, `hasVoted` | turnout, and whether this wallet has a ballot recorded |
| `trusteeCount`, `shareCount`, `isTrustee`, `hasSubmittedShare` | decryption progress |
| `tallied`, `finalYes`, `finalNo`, `finalAbstain` | result (zero until tallied) |
| `participantCount`, `hasCheckedIn` | tester check-ins across all polls |

## Things to know

- **Keys are roles.** The per-contract secret key is voter credential, organizer authority
  and trustee share at once. Persist it and offer backup, or users lose roles on reload.
- **Validate before proving.** Proofs take 30–120 s. The API rejects bad input (vote
  choice, quorum, past deadline, commitment length) before proving, and so should you.
- **Admin only creates polls.** A deployed contract accepts new polls only from the
  deploying key.
- **n-of-n trustees.** Every registered trustee must submit a share, or the result stays
  sealed for good.
- **Decryption cost** is O(ballots²/2) curve operations. That's fine for hundreds of
  voters; use BSGS for much larger rolls.
- **Contract upgrades change the ledger layout.** A contract deployed from an older version
  of the source can't be read by a newer API. Deploy a fresh contract after a contract change.
