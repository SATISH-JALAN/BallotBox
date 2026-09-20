# Deployments

Public, commit-safe records of BallotBox contract deployments. Nothing here is secret.

| File | Written by | Contents |
|---|---|---|
| `<network>.json` | `npm run deploy` | contract address, deploy tx hash and block, demo poll tx hashes |
| `participants-<network>.json` / `.csv` | `npm run export-participants -- <address>` | wallets that checked in as testers, read from contract state |

Anyone can reproduce the participant export from chain data. Admin keys are written to
`private-polling-cli/.secrets/` instead, which is gitignored.
