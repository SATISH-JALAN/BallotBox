# Deployment guide

This covers deploying the contract to Midnight **Preprod**, hosting the web app on
**Vercel** through GitHub Actions, and producing the verification records reviewers ask for.

- [1. Deploy the contract](#1-deploy-the-contract)
- [2. Host the web app on Vercel](#2-host-the-web-app-on-vercel)
- [3. Point everything at the new contract](#3-point-everything-at-the-new-contract)
- [4. Verification records](#4-verification-records)
- [5. Running the next poll](#5-running-the-next-poll)

---

## 1. Deploy the contract

### Prerequisites

- The contract compiled (`npm run compact`) and packages built (`npm run build`)
- The proof server running: `npm run proof-server`
- A Preprod wallet **seed** (64 hex characters) funded with tNIGHT from the
  [faucet](https://faucet.preprod.midnight.network/)

> ⚠️ **Use a fresh wallet, never a seed that has appeared in git history.** Earlier
> versions of this repository hardcoded a deploy seed in `deploy-direct.ts`. That wallet
> must be treated as compromised.

### Run

```bash
cp private-polling-cli/.env.example private-polling-cli/.env
# edit .env: MIDNIGHT_WALLET_SEED, PRIVATE_STATE_PASSWORD, and optionally DEMO_POLL_QUESTION
npm run deploy
```

The script:

1. Syncs the wallet and registers tNIGHT for DUST generation (waits up to 5 minutes).
2. Deploys the contract. The deploying key becomes the **admin**.
3. If `DEMO_POLL_QUESTION` is set, starts that poll with open enrollment, registers the
   deployer as trustee, and opens voting for `DEMO_POLL_DAYS` days.
4. Writes:
   - `deployments/preprod.json`, the **public record** (address, deploy tx, demo poll tx hashes). Commit it.
   - `private-polling-cli/.secrets/<address>.json`, the **admin key**. Gitignored. Back it up somewhere safe.

To manage the poll from a browser, open it in the web app, press 🔑 → **Restore from file**,
and choose the `.secrets/<address>.json` file.

> The demo poll uses the deployer as its only trustee so it can always be tallied. That
> suits a public demo. For a binding vote, have independent people press **Become a
> trustee** before voting opens.

## 2. Host the web app on Vercel

Deployment runs from [`.github/workflows/deploy.yaml`](../.github/workflows/deploy.yaml):
PRs get preview URLs and `main` goes to production.

### One-time setup

1. **Create the project.** Install the CLI (`npm i -g vercel`), then:
   ```bash
   cd private-polling-ui
   vercel link          # create a new project, e.g. "ballotbox"
   cat .vercel/project.json   # note orgId and projectId
   ```
2. **Create a token** at <https://vercel.com/account/tokens>.
3. **Add GitHub secrets** (repo → Settings → Secrets and variables → Actions → *Secrets*):
   | Name | Value |
   |---|---|
   | `VERCEL_TOKEN` | the token from step 2 |
   | `VERCEL_ORG_ID` | `orgId` from `.vercel/project.json` |
   | `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |
4. **Add GitHub variables** (same page → *Variables*). They are baked into the build:
   | Name | Example |
   |---|---|
   | `VITE_CONTRACT_ADDRESS` | the address from `deployments/preprod.json` |
   | `VITE_X_URL` | `https://x.com/<handle>` |
   | `VITE_FEEDBACK_URL` | your Google Form URL. Leave empty to use the GitHub feedback issue form |
5. Push to `main`, or run the workflow manually from the Actions tab. The deployment URL
   appears in the job summary.

Vercel's own Git builds are disabled in `private-polling-ui/vercel.json`. Vercel can't
compile Compact contracts, so every deployment goes through CI.

### Deploy by hand (fallback)

```bash
npm run compact && npm run build
cd private-polling-ui
VITE_CONTRACT_ADDRESS=<address> npm run build
npm run vercel:output
vercel deploy --prebuilt --prod
```

## 3. Point everything at the new contract

After a (re)deploy, update these:

- [ ] GitHub variable `VITE_CONTRACT_ADDRESS`, then re-run *Deploy*
- [ ] `README.md`: the *Live app*, *Preprod contract* and *Live on Preprod* rows
- [ ] `docs/USER_GUIDE.md`: the live app link
- [ ] Your X profile bio or pinned post
- [ ] `CHANGELOG.md`: note the new address and why it changed

## 4. Verification records

```bash
npm run verify -- <address>               # independently re-derives a published tally
npm run export-participants -- <address>  # deployments/participants-preprod.{json,csv}
```

Commit the exports when you submit. Each row is a checked-in wallet's coin public key in
hex and Bech32m. Reviewers can run the same command and get the same list from chain data.

## 5. Running the next poll

Only the admin key can start a poll. When the current poll is `CLOSED`, open the contract
in the web app with the admin key restored, fill in **Start a new poll**, register
trustees, and open voting. The participant list carries across polls.
