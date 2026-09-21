# Submission checklist — Levels 4, 5, 6

Where each requirement is met in this repository, and what still has to be done by hand.
✅ = in the repo · 🧑 = needs the maintainer (accounts, funds, recordings, real users).

## 🌔 Level 4 — Waxing Gibbous: MVP live on Preprod

| Requirement | Evidence | Status |
|---|---|---|
| Privacy-critical core first | Contract v3 ([source](../contract/src/private-polling.compact)), 47 contract tests, [PRIVACY.md](../PRIVACY.md) | ✅ |
| Working MVP on Preprod (verifiable address) | `npm run deploy` → [`deployments/preprod.json`](../deployments/) + README *Live on Preprod* | 🧑 deploy with a funded wallet |
| Live demo link | Vercel Git integration, built by [`vercel.json`](../vercel.json) | ✅ <https://private-pooling.vercel.app> |
| Documentation: README + setup + usage | [README](../README.md), [User guide](./USER_GUIDE.md), [Architecture](./ARCHITECTURE.md), [Deployment](./DEPLOYMENT.md), [Integration](../api/INTEGRATION.md) | ✅ |
| CI/CD pipeline with passing runs | [`ci.yaml`](../.github/workflows/ci.yaml) + [`deploy.yaml`](../.github/workflows/deploy.yaml), badges in README | ✅ after push · 🧑 confirm green run |
| Product X profile linked in README | [Launch kit](./LAUNCH_KIT.md) | 🧑 create profile, replace `@REPLACE_WITH_HANDLE` |
| Demo video of the MVP | Script below | 🧑 record |
| ≥ 15 meaningful commits | 28 already, plus the split suggested below | ✅ |

**Before submitting L4, search for and replace** `REPLACE_WITH_HANDLE` in `README.md`.
The contract address and the live app (<https://private-pooling.vercel.app>) are already filled in.

### Files the challenge prompts ask for by name

| File | Purpose | State |
|---|---|---|
| [`PROPOSAL.md`](../PROPOSAL.md) | product, why Midnight, data model, mainnet feasibility | ✅ drafted — review the wording |
| [`docs/USAGE.md`](./USAGE.md) | plain-English usage, first transaction, troubleshooting | ✅ |
| [`docs/FEEDBACK.md`](./FEEDBACK.md) | collection method, raw log, themes, what changed, L6 improvements | ✅ process · 🧑 fill as testers arrive |
| [`USERS.md`](../USERS.md) | 50 Preprod wallets (L5) | ✅ generated · 🧑 needs real testers |
| [`LAUNCH_USERS.md`](../LAUNCH_USERS.md) | 70 Preprod wallets (L6) | ✅ generated · 🧑 needs real testers |
| [`docs/LAUNCH_KIT.md`](./LAUNCH_KIT.md) | launch posts, recruitment, onboarding script, brand brief | ✅ |

`USERS.md` and `LAUNCH_USERS.md` are never edited by hand:

```bash
npm run export-participants -- <address>   # read the participant set from chain state
npm run sync-users                         # rewrite both tables from that export
```

### Demo video script (3–4 min)
1. **Problem (15 s):** private *or* verifiable — why not both.
2. **Landing (20 s):** invite link, then the wallet-free preview of the live Preprod poll.
3. **Voter (60 s):** connect, **Join this poll**, vote (show the proving timer), “ballot recorded”, re-vote.
4. **Organizer (60 s):** deploy or restore the admin key, start a poll with open enrollment, become a trustee, open voting, share the link.
5. **Result (45 s):** close, submit the decryption share, publish, then run `npm run verify -- <address>` in a terminal.
6. **Proof (20 s):** contract address on Preprod, CI badge green, X profile, tester check-in.

## 🌕 Level 5 — Full Moon: 50 users + feedback loop

| Requirement | Evidence | Status |
|---|---|---|
| Same MVP, extended | Same repo and contract line. Iterations logged in [FEEDBACK.md](./FEEDBACK.md#iteration-history) | ✅ ongoing |
| 50 Preprod users (verifiable wallet addresses) | Testers press **Count me as a tester** → `npm run export-participants -- <address>` → commit `deployments/participants-preprod.{json,csv}` | 🧑 recruit ([launch kit](./LAUNCH_KIT.md#4-tester-recruitment-messages)) |
| Feedback loop documented | [FEEDBACK.md](./FEEDBACK.md): process, log, iteration history. In-app form + issue form | ✅ process · 🧑 fill the log |
| Updated documentation | Keep README, user guide and changelog in step with each iteration | 🧑 per iteration |
| Demo video of full functionality | Same script, plus one iteration shipped from feedback | 🧑 |
| ≥ 20 meaningful commits | Already met. Keep each iteration's change as its own commits | ✅ |

**How reviewers verify the 50 users:** the participant set is contract state. Anyone can
run `npm run export-participants -- <address>` and get the same list. Each row is a
checked-in wallet's coin public key (hex and `mn_shield-cpk_…`). Optionally add the
unshielded addresses that testers give voluntarily in the feedback form.

## 🌝 Level 6 — Supermoon: 70 users

| Requirement | Evidence | Status |
|---|---|---|
| Same MVP from Level 4, extended | as above | ✅ |
| 70 Preprod users (verifiable) | same export, ≥ 70 rows | 🧑 |
| Feedback loop documented + updated docs | at least two iterations in [FEEDBACK.md](./FEEDBACK.md#iteration-history) | 🧑 |
| Demo video showing full functionality | | 🧑 |
| ≥ 30 meaningful commits | see the suggested split below | ✅ after committing |

## Suggested commit split for the current changes

Small, reviewable commits that each build and read well in history (in order):

1. `fix(api): compare curve points by coordinate so tally publishing works`
2. `test(api): add end-to-end tally decryption tests up to 70 voters`
3. `feat(contract)!: fix contract admin at deployment and gate createPoll`
4. `fix(contract): hash-chain pollId per poll to stop cross-poll linkability`
4a. `fix(contract): reset curve points to a computed identity so createPoll proves`
4b. `fix(contract): make ballot replacement branch-free so first votes prove`
4c. `test(cli): add end-to-end poll run against a local Midnight network`
4d. `ci: run the end-to-end poll on pushes to main`
5. `feat(contract): add per-poll open enrollment with a historic eligibility roll`
6. `feat(contract): add opt-in participant check-in separate from ballots`
7. `test(contract): cover admin, poll identity, enrollment and check-in`
8. `feat(api): add selfEnroll, checkIn, poll options and transaction receipts`
9. `security(cli): read the deploy wallet seed from the environment`
10. `feat(cli): record deployments, back up the admin key, optional demo poll`
11. `feat(cli): add self-enrol and check-in menu options and participant export`
12. `fix(ui): persist per-poll secret keys across reloads`
13. `feat(ui): add key backup and restore`
14. `refactor(ui): split the poll card into per-stage sections with a lifecycle stepper`
15. `feat(ui): open enrollment, batch enrollment and friendly errors`
16. `feat(ui): wallet-free poll preview, invite links and first-run checklist`
17. `feat(ui): tester check-in and always-visible feedback button`
18. `fix(ui): load Preprod config and serve circuit keys in dev`
19. `test(ui): cover key persistence, backup parsing and input handling`
20. `build: cross-platform contract compile and root workspace scripts`
21. `ci: split contract compile from a package matrix and check shipped keys`
22. `ci: deploy the web app to Vercel with prebuilt output`
23. `chore: consolidate dependabot on the workspace lockfile, drop stale lockfiles`
24. `docs: rewrite README for BallotBox`
25. `docs: add user guide, architecture and deployment guides`
26. `docs: rewrite privacy model for contract v3`
27. `docs: add feedback loop, launch kit and submission checklist`
28. `chore(github): add user feedback issue form and project CODEOWNERS`
