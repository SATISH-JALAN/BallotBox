# Private Polling — Privacy-Preserving Voting DApp on Midnight Network 🗳️

[![CI](https://github.com/SATISH-JALAN/private-pooling/actions/workflows/ci.yaml/badge.svg)](https://github.com/SATISH-JALAN/private-pooling/actions/workflows/ci.yaml)

A zero-knowledge, privacy-preserving polling application built on the Midnight Network using Compact smart contracts. Users can create polls, cast votes, and view aggregate results — without ever exposing their individual vote or identity.

**Level 3 idea:** [Private Voting](#initial-idea) — anonymous ballots with publicly verifiable tallies.

---

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `0200dbf964f541e1950883f5b2f539b66fd6111e46ce8e6e9551fbdd180114d5dd5b` |

```env
CONTRACT_ADDRESS=0200dbf964f541e1950883f5b2f539b66fd6111e46ce8e6e9551fbdd180114d5dd5b
```

---

## Features

- 🗳️ **On-chain polls** — Create a poll, cast Yes / No / Abstain, close it, all on Midnight
- 📊 **Transparent tallies** — Public ledger tracks aggregate vote counts in real time
- 👑 **Creator controls** — Only the poll creator can close a poll, verified via ZK proof of a
  secret key that never leaves the device
- 🔑 **Keys stay local** — Secret keys are held in private state and proven, never transmitted
- 🌐 **Web UI** — React interface with live vote bars and wallet integration
- 💻 **CLI** — Command-line tool for deploying and interacting with polls directly

> ⚠️ **Ballot secrecy is not implemented yet.** Vote choices are currently public, there is
> though eligibility and one-vote-per-person now are. See
> [Known limitations](#known-limitations).

---

## What This Project Does

Private Polling runs decentralized polls on Midnight, with the goal of anonymous ballots and
publicly verifiable tallies.

In traditional voting systems you either trust a centralized server, or you make your vote
public on a blockchain. The end state for this project is neither — but it is worth being
precise about how far along it is.

**How a poll works:**

A poll moves through four states — `CLOSED` → `REGISTRATION` → `OPEN` → `TALLYING` →
`CLOSED`. Enrollment and trustee registration must finish before voting opens, so the roll
and the trustee set are both frozen for the whole voting window.

1. The organizer deploys the contract and calls `createPoll`, which opens **registration**,
   optionally with a voting deadline and a quorum
1b. One or more parties call `registerTrustee`. Their keys are summed into a joint tally
   key whose matching secret is never assembled anywhere — so no one can decrypt alone
2. Each voter derives their own enrolment commitment — a one-way hash of a secret key that
   never leaves their device — and gives it to the organizer
3. The organizer calls `enrollVoter` for each commitment, building a Merkle roll
4. The organizer calls `openVoting`, freezing the roll
5. A voter casts a ballot. The circuit proves in zero knowledge that they hold a secret
   whose commitment is *somewhere* in the roll — without revealing which leaf — spends a
   nullifier so the same credential cannot vote twice, and adds an **encrypted** ballot to
   the running aggregate. The choice is a private witness, never a public input
6. A voter may re-vote at any time before the deadline. The new ballot **replaces** the
   old one in the aggregate rather than adding to it, so only the last vote counts
7. Voting stops automatically at the on-chain deadline — the organizer cannot extend it
   after seeing how the vote is going
8. `closeVoting` moves the poll to **tallying** — by the organizer, or by anyone once the
   deadline has passed, so a poll cannot be held open indefinitely
9. Each trustee submits a decryption share, proven in-circuit to match the key they
   registered. **Every** trustee must contribute: one honest holdout keeps the result sealed
10. Once all shares are in the combined value is public, so **anyone** can call
   `publishTally`. The circuit re-encrypts the submitted counts and checks them against the
   accumulated ciphertext, so the published result cannot disagree with the ballots cast.
   If quorum was set and not reached, the result is published but flagged as non-binding

**What the ZK layer covers:** eligibility (Merkle membership proofs), one-vote-per-credential
(nullifiers), ballot secrecy (exponential ElGamal over Jubjub), and a verified tally — the
organizer cannot publish a result the ballots do not support.

**What it does not cover yet:** coercion resistance. A voter knows their own blinding
factor, so they can still prove to a third party how they voted. Vote overriding is the
fix — see [`PRIVACY.md`](./PRIVACY.md).

---

## Privacy Model

> Ballots are secret, eligibility is proven in zero knowledge, and each credential votes
> once. The remaining gap is **coercion resistance** — see
> [Known limitations](#known-limitations) and [`PRIVACY.md`](./PRIVACY.md).

| Data | Visibility today |
|------|-----------|
| Poll question | ✅ Public |
| Poll status (Open / Closed) | ✅ Public |
| Turnout (ballots cast) | ✅ Public |
| Final counts | ✅ Public — but only after the organizer decrypts and publishes |
| Poll creator (hashed) | ✅ Public |
| **Individual vote choice** | ❌ Private — encrypted per ballot; never a public input |
| **Voter identity** | ❌ Private — membership is proven in ZK; the per-ballot nullifier is public but unlinkable to the voter |
| Poll creator's secret key | ❌ Private — never leaves the device |
| Voter's secret key | ❌ Private — never leaves the device |

### What the ZK layer actually guarantees today

- The poll creator's secret key never leaves the device; ownership is proven via the
  `derivedPublicKey()` hash inside a ZK circuit, so `closePoll` is authenticated without
  revealing the key.
- Compact's explicit `disclose()` operator marks every value that becomes public, which
  makes the privacy boundary auditable by reading the source.

### Known limitations

These are real gaps in the current contract, not hypotheticals — each is pinned by a test
in [`contract/src/test/private-polling.test.ts`](./contract/src/test/private-polling.test.ts)
under *"known limitations — Level 4 scope"*.

| Gap | Cause | Consequence |
|-----|-------|-------------|
| A coercer can see *that* you re-voted | The stored ciphertext visibly changes | "Vote X and don't change it" is partly enforceable |


**Closed:** eligibility, double-voting, ballot secrecy, and coercion resistance. Voting
requires a ZK proof of roll membership; each credential contributes exactly one counted
ballot; the choice is encrypted so no individual ballot is readable by anyone — including
the organizer; and re-voting replaces an earlier ballot so a receipt proves nothing. All
are pinned by `CLOSED:` tests.

See [`PRIVACY.md`](./PRIVACY.md) for the full threat model.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Compact `v0.23` (compiler `0.31.0`) — Midnight ZK smart contract language |
| ZK Proofs | Midnight Proof Server (`midnightnetwork/proof-server`) |
| Frontend | React 19, TypeScript, Material-UI (MUI v9), Vite |
| Wallet | Midnight Lace / 1AM wallet (`@midnight-ntwrk/dapp-connector-api`) |
| CLI | Node.js, RxJS, Pino, LevelDB private state |
| Blockchain | Midnight Preprod testnet |

---

## Folder Structure

```
midnightt lvl 1/
├── contract/                        # Compact smart contract
│   ├── src/
│   │   ├── private-polling.compact  # Core ZK smart contract
│   │   ├── witnesses.ts             # Private state witnesses
│   │   └── index.ts                 # Contract exports & compiled bindings
│   └── package.json
├── api/                             # Shared contract API library
│   ├── src/
│   │   ├── common-types.ts          # TypeScript types & derived state
│   │   └── index.ts                 # PrivatePollingAPI class
│   └── package.json
├── private-polling-cli/             # Command Line Interface
│   ├── src/
│   │   ├── deploy-direct.ts         # Non-interactive deployment script
│   │   ├── config.ts                # Network configs (preprod / preview)
│   │   ├── midnight-wallet-provider.ts
│   │   └── generate-dust.ts         # UTXO dust registration
│   └── package.json
├── private-polling-ui/              # React Web Application
│   ├── src/
│   │   ├── components/              # Board, Layout, voting UI
│   │   ├── contexts/                # Wallet & deployment manager
│   │   ├── hooks/                   # React hooks
│   │   └── App.tsx                  # Root application
│   └── package.json
├── README.md
└── package.json                     # Workspace root
```

---

## Prerequisites

| Requirement | Version / Notes |
|------------|----------------|
| Node.js | v22+ (`node -v`) |
| Docker Desktop | Installed and running |
| Midnight wallet | [1AM](https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp) or [Lace Midnight Preview](https://chromewebstore.google.com/detail/lace-midnight-preview/hgeekaiplokcnmakghbdfbgnlfheichg) |
| Proof Server | Running on port 6300 (see below) |

### Start the Proof Server

```bash
docker run -d -p 6300:6300 midnightnetwork/proof-server
```

---

## Installation

```bash
# Root dependencies
npm install

# API
cd api && npm install && cd ..

# Contract
cd contract && npm install && cd ..

# CLI
cd private-polling-cli && npm install && cd ..

# UI
cd private-polling-ui && npm install && cd ..
```

---

## Compile Compact Contract

Requires the [Compact compiler](https://github.com/midnightntwrk/compact) (`compact`) on your `PATH`, pinned to the same version CI uses ([`.github/workflows/ci.yaml`](.github/workflows/ci.yaml)):

```bash
npm run compact
```

The official installer only ships Linux/macOS binaries, so on Windows run it inside a Linux container instead:

```bash
docker run --rm -v "${PWD}:/work" -w /work/contract debian:bookworm-slim bash -c "
  apt-get update -qq && apt-get install -y -qq curl xz-utils unzip ca-certificates &&
  curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh &&
  export PATH=\$HOME/.local/bin:\$PATH &&
  compact update 0.31.0 &&
  compact compile src/private-polling.compact ./src/managed/private-polling
"
```

---

## Build

```bash
# Build everything
npm run build

# Build CLI only
cd private-polling-cli && npm run build && cd ..

# Build UI only
cd private-polling-ui && npm run build && cd ..
```

---

## Testing

The Compact contract has a unit test suite that exercises the compiled circuits directly (no proof server or network required) using `@midnight-ntwrk/compact-runtime`'s local simulator.

```bash
cd contract
npm run test
```

The suite (`contract/src/test/private-polling.test.ts`) covers:

- **Identity hashing** — `derivedPublicKey` is deterministic for a given secret key and differs across secret keys, so no two voters can be linked to the same identity hash.
- **Initial state** — a freshly deployed contract starts `CLOSED` with no question and zeroed tallies.
- **`createPoll`** — opens the poll, stores the question, and discloses only the hashed owner (never the raw secret key); rejects opening a second poll while one is already open.
- **`castVote`** — tallies Yes/No/Abstain choices into public counters; rejects out-of-range choices and votes after the poll is closed.
- **Known limitations** — a dedicated block asserts the three gaps documented under
  [Known limitations](#known-limitations): repeat voting by one key is accepted, an
  unenrolled key may vote, and a single ballot is fully identifiable from the public
  counters. These pass today by design, and the Level 4 rewrite must change them.
- **`closePoll`** — only succeeds for the secret key that matches the poll's disclosed owner hash; a different key is rejected.

This runs as part of CI (`npm run ci` inside `contract/`, wired into [`.github/workflows/ci.yaml`](.github/workflows/ci.yaml)) on every push and pull request to `main`.

## Run Locally (Development)

```bash
cd private-polling-ui
npm run dev
```

Open **http://localhost:5173** in your browser. Make sure your Midnight wallet extension is installed and connected to Preprod.

---

## Deploy the Contract

### Prerequisites
1. Docker proof server running on port 6300
2. Fund your wallet at **https://midnight-tmnight-preprod.nethermind.dev/**  
   Wallet address: `mn_addr_preprod1cnd58wudtqdm8g5ufe0r7mpsd690vesnhmgsze9d96pwu03szg5qqsqzdj`

### Run Deployment

```bash
cd private-polling-cli
npm run deploy-direct
```

---

## Integrating BallotBox

`api/` is the integration surface — everything the UI and CLI do, they do through it. A DAO
adding private voting to an existing governance stack depends on that package and nothing
below it. See [`api/INTEGRATION.md`](./api/INTEGRATION.md) for the full lifecycle, state
reference, and the constraints worth knowing before you build on it.

---

## Performance

Measured from the compiled circuits (Compact `0.31.0`). Prover key size is a good proxy for
proving cost:

| Circuit | Prover key | Notes |
|---|---:|---|
| `castVote` | 10.51 MB | Merkle path + eligibility + nullifier + two EC encryptions |
| `registerTrustee` | 2.95 MB | one scalar multiplication |
| `submitDecryptionShare` | 2.95 MB | two scalar multiplications |
| `createPoll` | 2.70 MB | |
| `enrollVoter` | 2.69 MB | |
| `openVoting` / `closeVoting` | 2.69 MB | |
| `publishTally` | 0.34 MB | cheapest — one re-encryption check |

`castVote` dominates at roughly 4× everything else, and the Merkle membership proof is why.
Its cost scales with **tree depth, not roll size**, so the depth-10 tree (1024 voters) is
the tuning knob: halving depth roughly halves that portion of the work, and raising it to
cover more voters costs proportionally more per ballot.

The other scaling limit is tally decryption, which searches `(yes, no)` pairs bounded by
public turnout — O(n²/2) curve operations. Fine for hundreds of voters; a larger roll would
want baby-step giant-step instead.

---

## Verify a Published Tally

Any member can independently check a published result. No wallet, no private state, and
no secret key required — everything it checks is public:

```bash
cd private-polling-cli
npm run verify -- <contract-address>
```

It confirms the published counts sum to the ballots recorded, that no credential
contributed more than one counted ballot, and that the ballot set fits the eligibility
roll. It cannot re-derive the counts from the ciphertext — that needs the organizer's
tally key — but the contract already verified them on-chain when they were published,
which is what makes the numbers binding.

On success you will see:

```
====================================================
DEPLOYMENT SUCCESSFUL!
Contract Address: 0200dbf964f541e1950883f5b2f539b66fd6111e46ce8e6e9551fbdd180114d5dd5b
====================================================
```

---

## Environment Variables

| Variable | Description | Value |
|----------|-------------|-------|
| `VITE_NETWORK_ID` | Midnight network | `preprod` |
| `VITE_LOGGING_LEVEL` | Log verbosity | `trace` |
| `CONTRACT_ADDRESS` | Deployed contract address | `0200dbf964f541...` |

---

## Demo

📹 **[Watch the demo video](https://drive.google.com/drive/folders/17Wp-457jbYBe5BfflG4Z4f4I7z0sTcat?usp=sharing)** — walkthrough of deploying a poll, connecting a wallet, and casting a vote on Midnight Preprod.

---

## Screenshots

### Web UI — Landing Page

![Private Polling UI](./private-polling-ui/public/image.png)

> The main interface showing the hero section, privacy model features, wallet connection button, and the poll card for deploying or joining a poll.

### Private Polling CLI

> Run `npm run deploy-direct` inside `private-polling-cli/` to deploy and interact via terminal.

---

## The Idea

**Idea #11 — Private Polling** from the Midnight Builder Level 1 Challenge, carried forward
for Level 3 as **Private Voting** (anonymous ballots with publicly verifiable tallies).

The goal: anonymous, verifiable on-chain voting where individual choices are confidential via
ZK proofs, while aggregate tallies remain transparent and cryptographically verifiable on the
Midnight ledger.

### Where it stands

Levels 1–3 delivered a deployed, working contract with a UI and CLI, and genuine ZK creator
authentication. It does **not** yet deliver ballot secrecy — see
[Known limitations](#known-limitations). The project is a privacy-preserving *deployment*,
not yet a private *ballot*.

### Roadmap — BallotBox

Turning it into a real anonymous ballot system needs four mechanisms, detailed in
[`PRIVACY.md`](./PRIVACY.md) and specified in [`contract/DESIGN-V2.md`](./contract/DESIGN-V2.md):

| Mechanism | Status | What it fixes |
|---|---|---|
| **Merkle eligibility** — prove roll membership in ZK without revealing which leaf | ✅ Shipped | Anyone could vote |
| **Nullifiers** — `hash(voterSecret, pollId)` in a spent set | ✅ Shipped | One key could vote unlimited times |
| **Homomorphic tallying** — aggregate encrypted ballots, open only the sum | ✅ Shipped | Vote choices were public |
| **Vote overriding** — re-vote, last counts | ✅ Shipped | A voter could prove their vote to a briber |
| **Threshold decryption** — joint key split across trustees | ✅ Shipped | The organizer alone could open the tally |

Why Midnight specifically: `disclose()` makes the privacy boundary auditable — every value
that becomes public must be marked in the source, so a reviewer can enumerate exactly what
leaks. That is how the gap above was found in this very contract.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Proof server connection failed | Run `docker run -d -p 6300:6300 midnightnetwork/proof-server` and verify with `docker ps` |
| Wallet not detected | Ensure Midnight Lace or 1AM extension is enabled and connected to Preprod network |
| Out of memory during deployment | Use `node --max-old-space-size=8192` (already set in `deploy-direct` script) |
| Dust balance 0 after registration | Wait 2-5 minutes and re-run — the preprod network takes time to generate dust from registered UTXOs |
| WebSocket disconnects | Normal on preprod — the script reconnects automatically |
