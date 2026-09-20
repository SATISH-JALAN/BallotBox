# Security policy

BallotBox is a privacy product, so a flaw that links a voter to a ballot is a serious bug
even on a test network.

## Supported versions

Only the latest release on `main`, and the contract deployed from it
([`deployments/`](./deployments/)), receives fixes. BallotBox runs on Midnight **Preprod**
and is not audited. Don't use it for high-stakes votes.

## Reporting a vulnerability

Please **don't open a public issue.** Report privately with
[GitHub private vulnerability reporting](https://github.com/SATISH-JALAN/private-pooling/security/advisories/new).

Especially relevant:

- linking a voter, commitment, check-in or wallet to a ballot
- forging eligibility, reusing or bypassing a nullifier, or inflating the tally
- publishing a tally that doesn't match the ballots
- opening the tally without every trustee's share
- extracting secret keys from the web app, backups or the CLI

Include the affected commit or contract address, reproduction steps, and the impact you
expect. You'll get an acknowledgement within 3 business days and a plan within a further 7.
The threat model and known, accepted limitations are in [PRIVACY.md](./PRIVACY.md). Please
check there first.

## Handling secrets

- Never commit a wallet seed, `.env`, or a `ballotbox-key-*.json` / `.secrets/` file.
- A seed was hardcoded in an earlier revision of `private-polling-cli/src/deploy-direct.ts`.
  That wallet is considered compromised and must not be used.
