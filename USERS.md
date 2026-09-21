# Preprod Users — Level 5

Target: 50 verified wallet addresses. **Current count: 0 / 50.**

Every row below is a wallet that pressed **Count me as a tester** in the app, which writes
it to the contract's participant set. This file is generated — it is never edited by hand:

```bash
npm run export-participants -- 7423df36535c53ec590fd268f36771b9b9bd63ab741706062ac820f7b59f9351
npm run sync-users
```

Anyone can run those two commands and get the same list from public chain state, so the
count does not have to be taken on trust.

| Network | Contract | Exported |
|---|---|---|
| preprod | `7423df36535c53ec590fd268f36771b9b9bd63ab741706062ac820f7b59f9351` | 2026-09-21 14:07:50 UTC |

| # | Wallet (ShieldedCoinPublicKey) | Date Added |
|----|----------------|------------|
| — | _no wallets have checked in yet_ | — |

Hex forms of the same keys are in
[`deployments/participants-preprod.json`](./deployments/participants-preprod.json) and
[`.csv`](./deployments/participants-preprod.csv).
