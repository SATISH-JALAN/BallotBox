# BallotBox CLI

Node tooling for BallotBox on Midnight: an interactive client, a scripted deployer, and two
verification tools that need no wallet.

Run the commands below from the **repository root**, after `npm ci`, `npm run compact` and
`npm run build`. They read `private-polling-cli/.env`; copy [`.env.example`](./.env.example) to create it.

| Command | What it does | Needs a wallet |
|---|---|---|
| `npm run cli` | Interactive menu for every circuit on Preprod | yes (seed prompt) |
| `npm run deploy` | Deploy a contract, optionally start a public demo poll, and write `deployments/preprod.json` + the admin key backup | yes (`MIDNIGHT_WALLET_SEED`) |
| `npm run verify -- <address>` | Independently re-derive and check a published tally | no |
| `npm run export-participants -- <address>` | Export checked-in tester wallets to `deployments/participants-preprod.{json,csv}` | no |

Every command that proves needs a proof server: `npm run proof-server` (Docker, port 6300).

## Interactive menu

```
 1. Create a new poll (opens enrollment)      9. Display derived poll state
 2. Enroll a voter commitment (organizer)    10. Register as a decryption trustee
 3. Open voting (organizer)                  11. Close voting
 4. Cast a vote (0 Yes, 1 No, 2 Abstain)     12. Submit my decryption share
 5. Publish the tally (anyone)               13. Enrol myself (open-enrollment polls)
 6. Show my voter commitment                 14. Check in as a participant
 7. Display ledger state                     15. Exit
 8. Display private secret key
```

## Environment

| Variable | Used by | Purpose |
|---|---|---|
| `MIDNIGHT_WALLET_SEED` | deploy | 64-hex seed of a funded Preprod wallet. **Never commit** |
| `PRIVATE_STATE_PASSWORD` | deploy | encrypts the LevelDB private state |
| `DEMO_POLL_QUESTION`, `DEMO_POLL_DAYS` | deploy | start an open-enrollment poll right after deploying |
| `PROOF_SERVER_URL`, `INDEXER_URL`, `INDEXER_WS_URL`, `NODE_URL` | all | endpoint overrides (Preprod defaults) |

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for the full deploy procedure.
