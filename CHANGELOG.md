# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-09-14 — Level 4 MVP: “BallotBox”

A contract redeploy is **required**: the ledger layout changed, and the previously
published Preprod address no longer resolves on the network.

### Added
- **Contract admin**, fixed at deployment. Only the admin can start polls, so a finished
  shared contract can't be taken over.
- **Open enrollment** per poll: `selfEnroll` lets any wallet join during REGISTRATION or OPEN.
  Invite-only polls keep organizer enrollment.
- **Historic eligibility roll**, so late enrollments don't invalidate in-flight ballot proofs.
- **Duplicate-commitment protection** on the roll.
- **Participant check-in** (`checkIn`): an opt-in, on-chain tester list unconnected to ballots.
- Web app: persistent per-poll keys, key **backup and restore**, **invite links** with a
  wallet-free poll preview, lifecycle stepper, first-run checklist, friendly error messages,
  batch voter enrollment, transaction receipts, and an always-visible **Feedback** button.
- CLI: `export-participants`, self-enrol and check-in menu options, and a `deploy` that
  writes `deployments/<network>.json`, an admin key backup, and an optional demo poll.
- API: `selfEnroll`, `checkIn`, `CreatePollOptions`, and a `TxReceipt` from every call.
- Tests: 16 new contract tests, API end-to-end tally tests (up to 70 voters), UI tests
  (65 total), plus a 26-step end-to-end poll run with real proofs and transactions on a
  local Midnight network.
- CI split into a contract compile job and a package matrix; **Vercel CD** workflow
  (PR previews, production on `main`).
- Docs: user guide, architecture, deployment, feedback loop, integration guide, launch kit,
  submission checklist; feedback issue form.
- Cross-platform `npm run compact` (WSL on Windows) and root scripts for dev, test, deploy and verify.

### Fixed
- **Creating a poll could never be proven.** `resetToDefault()` on `JubjubPoint` fields
  produced a different value in the compiled circuit than in the JS runtime, so the proof
  server rejected `createPoll` ("public transcript input mismatch"). The fields are now
  reset to an explicitly computed identity point.
- **A first vote could never be proven.** The re-vote branch looked up a missing map key,
  and since a circuit evaluates both branches, that yielded an off-curve point and the proof
  server rejected every first ballot. Ballot replacement is now branch-free, using an
  identity sentinel.
- Neither of these shows up in simulator unit tests. Both were found, and the fixes
  confirmed, by the new end-to-end run on a local Midnight network (`npm run e2e:standalone`).
- **Publishing a result always failed.** Tally decryption compared curve points with
  `JSON.stringify`, which throws on `bigint`.
- **Reloading the page lost the secret key**, which dropped voter eligibility and could seal
  a poll permanently if a trustee reloaded.
- **Voters were linkable across polls.** `pollId` did not change between polls by the same
  organizer, so nullifiers repeated.
- `npm run dev` didn't load Preprod settings or serve circuit keys, so proofs failed locally.
- Wallet connection errors were all reported as “Application is not authorized”.
- Dependabot targeted per-package lockfiles that the workspace doesn't use.

### Security
- Removed a **hardcoded wallet seed** from `deploy-direct.ts`. Seeds now come from the
  environment. Treat the previously committed seed as compromised.

### Changed
- Product renamed to **BallotBox**. License metadata aligned to Apache-2.0.

## [0.2.0] — 2026-08-30 — Level 3

### Added
- Merkle eligibility, poll-bound nullifiers, encrypted (ElGamal) ballots, vote overriding,
  n-of-n threshold decryption, on-chain deadline and quorum, tally verifier.

## [0.1.0] — 2026-07-30 — Levels 1–2

### Added
- Initial private polling contract, CLI and web UI based on the Midnight bulletin-board scaffold.
