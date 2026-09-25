# Submission checklist — Level 6 (Supermoon)

**BallotBox** · Level 6 — Supermoon · **71 / 70 Midnight Preprod testers**

## Level 6 evidence

| | Requirement | Evidence |
|---|---|---|
| ✓ | Public GitHub repository | <https://github.com/SATISH-JALAN/BallotBox> |
| ✓ | Live demo | <https://private-pooling.vercel.app> |
| ✓ | Preprod contract | `7423df36535c53ec590fd268f36771b9b9bd63ab741706062ac820f7b59f9351` ([deployment record](../deployments/preprod.json)) |
| ✓ | 71 Preprod tester wallets | [USERS.md](../USERS.md) · [tester sheet](https://docs.google.com/spreadsheets/d/1J-nT1Xgwcj4PxhvRjP3K-VFehBlQUnCMYxksyBgtWSk/edit?resourcekey=&gid=1893711454#gid=1893711454) |
| ✓ | 70 required | Level 6 — Supermoon target |
| ✓ | 71 achieved | **71 / 70** |
| ✓ | Feedback documentation | [FEEDBACK.md](./FEEDBACK.md): 71 written reviews, 8.9 / 10 average, 630 / 710 points, themes and what changed |
| ✓ | Demo video | [Walkthrough](https://drive.google.com/drive/folders/17Wp-457jbYBe5BfflG4Z4f4I7z0sTcat?usp=sharing) |
| ✓ | CI/CD | [`ci.yaml`](../.github/workflows/ci.yaml) + [`deploy.yaml`](../.github/workflows/deploy.yaml) · [CI runs](https://github.com/SATISH-JALAN/BallotBox/actions) |
| ✓ | 30+ meaningful commits | [Commit history](https://github.com/SATISH-JALAN/BallotBox/commits/main) (71 commits on `main`) |

The sections below show where each requirement is met in the repository.

## 🌔 Level 4 — Waxing Gibbous: MVP live on Preprod

| Requirement | Evidence | Status |
|---|---|---|
| Privacy-critical core first | Contract v3 ([source](../contract/src/private-polling.compact)), 47 contract tests, [PRIVACY.md](../PRIVACY.md) | ✅ |
| Working MVP on Preprod (verifiable address) | `npm run deploy` → [`deployments/preprod.json`](../deployments/) + README *Live on Preprod* | ✅ deployed, address in [`deployments/preprod.json`](../deployments/preprod.json) |
| Live demo link | Vercel Git integration, built by [`vercel.json`](../vercel.json) | ✅ <https://private-pooling.vercel.app> |
| Documentation: README + setup + usage | [README](../README.md), [User guide](./USER_GUIDE.md), [Architecture](./ARCHITECTURE.md), [Deployment](./DEPLOYMENT.md), [Integration](../api/INTEGRATION.md) | ✅ |
| CI/CD pipeline with passing runs | [`ci.yaml`](../.github/workflows/ci.yaml) + [`deploy.yaml`](../.github/workflows/deploy.yaml), badges in README | ✅ CI and Deploy green on `main` |
| Product X profile linked in README | [@BallotMidnightt](https://x.com/BallotMidnightt) · [Launch kit](./LAUNCH_KIT.md) | ✅ |
| Demo video of the MVP | [Walkthrough](https://drive.google.com/drive/folders/17Wp-457jbYBe5BfflG4Z4f4I7z0sTcat?usp=sharing), script below | ✅ |
| ≥ 15 meaningful commits | 71 commits on `main` | ✅ |

The product X profile is [@BallotMidnightt](https://x.com/BallotMidnightt) and is linked from `README.md`.
The contract address and the live app (<https://private-pooling.vercel.app>) are already filled in.

### Files the challenge prompts ask for by name

| File | Purpose | State |
|---|---|---|
| [`PROPOSAL.md`](../PROPOSAL.md) | product, why Midnight, data model, mainnet feasibility | ✅ drafted — review the wording |
| [`docs/USAGE.md`](./USAGE.md) | plain-English usage, first transaction, troubleshooting | ✅ |
| [`docs/FEEDBACK.md`](./FEEDBACK.md) | collection method, ratings, 71 written reviews, themes, what changed | ✅ |
| [`USERS.md`](../USERS.md) | 70 Preprod testers (Level 6) | ✅ 71 / 70 testers listed |
| [`docs/LAUNCH_KIT.md`](./LAUNCH_KIT.md) | launch posts, recruitment, onboarding script, brand brief | ✅ |

**Tester evidence:** the Level 6 requirement (70 required, **71 / 70 achieved**) is shown by
the 71 Preprod tester wallets in [USERS.md](../USERS.md). The raw on-chain check-in export in
[`deployments/participants-preprod.*`](../deployments/) is a separate chain artifact, and it is
not the tester count used for this submission.

Running `npm run sync-users` rewrites the headers of `USERS.md` and `LAUNCH_USERS.md` from that
export, so don't run it unless you mean to replace the 71 / 70 headers with the check-in count.

### Demo video script (3–4 min)
1. **Problem (15 s):** private *or* verifiable — why not both.
2. **Landing (20 s):** invite link, then the wallet-free preview of the live Preprod poll.
3. **Voter (60 s):** connect, **Join this poll**, vote (show the proving timer), “ballot recorded”, re-vote.
4. **Organizer (60 s):** deploy or restore the admin key, start a poll with open enrollment, become a trustee, open voting, share the link.
5. **Result (45 s):** close, submit the decryption share, publish, then run `npm run verify -- <address>` in a terminal.
6. **Proof (20 s):** contract address on Preprod, CI badge green, X profile, tester check-in.

## 🌝 Level 6 — Supermoon: 70 users

| Requirement | Evidence | Status |
|---|---|---|
| Same MVP from Level 4, extended | as above | ✅ |
| 70 Preprod users (verifiable wallet addresses) | [USERS.md](../USERS.md) + [tester sheet](https://docs.google.com/spreadsheets/d/1J-nT1Xgwcj4PxhvRjP3K-VFehBlQUnCMYxksyBgtWSk/edit?resourcekey=&gid=1893711454#gid=1893711454) | ✅ 71 / 70 testers |
| Feedback loop documented + updated docs | [FEEDBACK.md](./FEEDBACK.md#feedback-loop): loop, themes, [what changed](./FEEDBACK.md#what-we-changed), and what is still open | ✅ |
| Demo video showing full functionality | [Walkthrough](https://drive.google.com/drive/folders/17Wp-457jbYBe5BfflG4Z4f4I7z0sTcat?usp=sharing) | ✅ |
| ≥ 30 meaningful commits | 71 commits on `main` | ✅ |

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
