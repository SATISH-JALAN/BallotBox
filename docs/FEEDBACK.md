# BallotBox — User Feedback

## Overview

BallotBox was tested on Midnight Preprod from 17 to 21 September 2026. This document
records that feedback cycle: how feedback was collected, the ratings testers gave, the full
response log, the product areas under review, and the iteration work done on the MVP.

The cycle covered:

- private voting
- poll creation and joining
- ballot submission
- wallet connection
- poll lifecycle
- transaction feedback
- tally verification
- onboarding
- documentation
- overall usability

---

## Feedback Collection Method

Testers sent feedback through BallotBox's own channels:

| Channel | What it captures | Where it lands |
|---|---|---|
| **In-app Feedback button** (visible on every page) | Structured feedback form: role, whether the tester voted, where they got stuck, and what to change first. Testers also gave a rating out of 10 and their public wallet address | The configured form (`VITE_FEEDBACK_URL`), or the [GitHub feedback issue form](https://github.com/SATISH-JALAN/private-pooling/issues/new?template=user-feedback.yml) as a fallback |
| **GitHub issues** | Bug reports, feature requests and documentation improvements | Repository issue templates (`.github/ISSUE_TEMPLATE/`) |
| **Community channels** | Informal reactions, questions and requests | Copied into the feedback log |
| **On-chain signals** | Enrolments, ballots and tester check-ins | `npm run verify` and `npm run export-participants` snapshots |

Feedback-form responses and on-chain check-ins are **separate datasets**. The 71 responses
below come from the feedback form. A form response is not counted as on-chain verified. A
wallet counts as verified only when it pressed **Count me as a tester** in the app and so
appears in the contract's participant set, which [USERS.md](../USERS.md) lists separately.

Feedback collection never needs private keys, seed phrases, wallet passwords, private
witnesses or ballot contents.

---

## Feedback Summary

| Metric | Value |
|---|---:|
| Total responses | 71 |
| Testing period | 17–21 Sep 2026 |
| Average rating | 8.9 / 10 |
| Median rating | 9 / 10 |
| Rating range | 4–10 |
| Rating 9–10 | 50 / 71 (70.4%) |
| Rating 8+ | 62 / 71 (87.3%) |
| Rating 6+ | 68 / 71 (95.8%) |
| Total rating points | 630 / 710 |

## Rating Distribution

| Rating | Responses | Percentage |
|---:|---:|---:|
| 10 | 26 | 36.6% |
| 9 | 24 | 33.8% |
| 8 | 12 | 16.9% |
| 7 | 6 | 8.5% |
| 6 | 2 | 2.8% |
| 5 | 0 | 0.0% |
| 4 | 1 | 1.4% |

The nine testers who rated BallotBox 7 or lower are the first to follow up with, to find out
where they got stuck.

---

## Individual Feedback Log

One row per feedback-form response, in the same order as the tester table in
[USERS.md](../USERS.md#preprod-testers--feedback-form), where each row's wallet address is
listed. Names are withheld. The exported responses include a rating and a date but no written
comments, so the Feedback column shows "—".

| # | Date | Rating | Feedback |
|---:|---|---:|---|
| 1 | 2026-09-19 | 7/10 | — |
| 2 | 2026-09-20 | 10/10 | — |
| 3 | 2026-09-19 | 10/10 | — |
| 4 | 2026-09-20 | 8/10 | — |
| 5 | 2026-09-19 | 9/10 | — |
| 6 | 2026-09-17 | 10/10 | — |
| 7 | 2026-09-21 | 9/10 | — |
| 8 | 2026-09-20 | 8/10 | — |
| 9 | 2026-09-18 | 9/10 | — |
| 10 | 2026-09-18 | 9/10 | — |
| 11 | 2026-09-18 | 7/10 | — |
| 12 | 2026-09-20 | 6/10 | — |
| 13 | 2026-09-17 | 4/10 | — |
| 14 | 2026-09-18 | 9/10 | — |
| 15 | 2026-09-20 | 8/10 | — |
| 16 | 2026-09-20 | 9/10 | — |
| 17 | 2026-09-18 | 9/10 | — |
| 18 | 2026-09-20 | 10/10 | — |
| 19 | 2026-09-20 | 10/10 | — |
| 20 | 2026-09-20 | 9/10 | — |
| 21 | 2026-09-17 | 9/10 | — |
| 22 | 2026-09-18 | 9/10 | — |
| 23 | 2026-09-19 | 10/10 | — |
| 24 | 2026-09-20 | 10/10 | — |
| 25 | 2026-09-19 | 10/10 | — |
| 26 | 2026-09-17 | 8/10 | — |
| 27 | 2026-09-19 | 8/10 | — |
| 28 | 2026-09-17 | 7/10 | — |
| 29 | 2026-09-21 | 10/10 | — |
| 30 | 2026-09-19 | 9/10 | — |
| 31 | 2026-09-18 | 8/10 | — |
| 32 | 2026-09-18 | 7/10 | — |
| 33 | 2026-09-20 | 9/10 | — |
| 34 | 2026-09-17 | 9/10 | — |
| 35 | 2026-09-19 | 6/10 | — |
| 36 | 2026-09-18 | 9/10 | — |
| 37 | 2026-09-18 | 9/10 | — |
| 38 | 2026-09-18 | 8/10 | — |
| 39 | 2026-09-17 | 9/10 | — |
| 40 | 2026-09-19 | 9/10 | — |
| 41 | 2026-09-17 | 8/10 | — |
| 42 | 2026-09-19 | 7/10 | — |
| 43 | 2026-09-17 | 7/10 | — |
| 44 | 2026-09-18 | 8/10 | — |
| 45 | 2026-09-17 | 8/10 | — |
| 46 | 2026-09-19 | 10/10 | — |
| 47 | 2026-09-17 | 10/10 | — |
| 48 | 2026-09-18 | 9/10 | — |
| 49 | 2026-09-21 | 10/10 | — |
| 50 | 2026-09-19 | 10/10 | — |
| 51 | 2026-09-19 | 10/10 | — |
| 52 | 2026-09-17 | 10/10 | — |
| 53 | 2026-09-19 | 9/10 | — |
| 54 | 2026-09-20 | 9/10 | — |
| 55 | 2026-09-17 | 8/10 | — |
| 56 | 2026-09-20 | 10/10 | — |
| 57 | 2026-09-17 | 10/10 | — |
| 58 | 2026-09-18 | 9/10 | — |
| 59 | 2026-09-19 | 10/10 | — |
| 60 | 2026-09-18 | 10/10 | — |
| 61 | 2026-09-17 | 9/10 | — |
| 62 | 2026-09-17 | 10/10 | — |
| 63 | 2026-09-19 | 10/10 | — |
| 64 | 2026-09-18 | 10/10 | — |
| 65 | 2026-09-19 | 8/10 | — |
| 66 | 2026-09-20 | 10/10 | — |
| 67 | 2026-09-18 | 10/10 | — |
| 68 | 2026-09-20 | 9/10 | — |
| 69 | 2026-09-18 | 10/10 | — |
| 70 | 2026-09-21 | 9/10 | — |
| 71 | 2026-09-20 | 10/10 | — |

---

## Feedback Themes

The response data contains ratings and dates, not written comments. So this section describes
the product areas the cycle evaluated, and what BallotBox does in each. It does not attribute
quotations to individual testers.

### Private Voting Experience

A BallotBox ballot is encrypted, and a zero-knowledge proof shows that the voter is enrolled
and has not voted already, without revealing who they are or what they chose. The question
here is whether that privacy model stays understandable without making the voting flow
harder to use.

### Onboarding

Many testers had never used Midnight Preprod. A first-run checklist on the landing page walks
them through the setup: install the wallet, fund it, then join a poll.

### Wallet Connection

Connecting a wallet is the first step where things can go wrong. BallotBox shows a distinct
state for each stage of the connection. It also turns raw wallet and SDK errors, such as
"Application is not authorized", into messages that say how to fix the problem.

### Poll Lifecycle

A poll moves through registration, voting, closing, tallying and publication. The poll view
shows one section per stage, with a stepper, so a tester can always see where the poll is
and what they can do next.

### Transaction Feedback

Proving and submitting a transaction takes time on Preprod. When a transaction succeeds, the
app shows a receipt with the transaction hash (linked to the explorer when one is configured)
and the block height.

### Tally Verification

Anyone should be able to understand the published result and check it against public chain
data without seeing an individual ballot. `npm run verify` rebuilds and checks the tally from
chain state alone.

### UI / UX

The main voting action stays prominent, and the technical detail is kept out of the primary
path. The interface uses a paper-ballot design system, so a poll reads like a ballot rather
than a dashboard.

### Documentation

Plain-English usage documentation helps testers who don't yet know Midnight, wallet setup or
the privacy model. The deployment and architecture guides serve technical readers.

---

## Response Actions

Each item below is implemented in the repository. Most came out of the pre-launch internal
review, when the full flow was tested end to end before testers were invited, and were
already in place for the September cycle.

| Feedback Area | BallotBox Response | Status |
|---|---|---|
| Onboarding | First-run checklist (`GettingStarted`) and clearer setup guidance | Implemented |
| Wallet / SDK errors | Friendly error translation (`lib/friendly-errors.ts`) | Implemented |
| Poll lifecycle | One poll section per lifecycle stage, plus a lifecycle stepper (`PollStepper`) | Implemented |
| Enrollment | Open and invite-only polls, with one-click **Join this poll** | Implemented |
| Poll keys | Poll keys persist in local storage, with backup and restore (`KeyBackupDialog`) | Implemented |
| Tally verification | Curve points compared by coordinate, and tally decryption tested up to 70 voters | Implemented |
| Transaction visibility | Transaction receipt with hash and block height | Implemented |
| Feedback collection | Feedback button on every page (`FeedbackButton`) | Implemented |
| Documentation | Plain-English usage guide and deployment documentation | Implemented |
| Poll-specific privacy | Each `pollId` is hash-chained from the previous poll, so each voter's nullifier is bound to one poll and can't link them across polls | Implemented |

---

## Product Iteration

BallotBox follows a continuous feedback loop:

```text
Test
  ↓
Collect
  ↓
Categorize
  ↓
Prioritize
  ↓
Implement
  ↓
Re-test on Preprod
```

Each new item is tagged with one area (`onboarding`, `wallet`, `proving`, `voting-ux`,
`organizer`, `docs`, `privacy` or `bug`). It is then merged into an existing theme and
classified as a `blocker`, `friction` or `idea`. Themes are scored and handled from the top
down:

**Priority = Impact × Reach ÷ Effort**

| Score | Impact | Reach | Effort |
|---|---|---|---|
| 3 | Blocks voting | ≥ 25% of respondents | ≤ ½ day |
| 2 | Causes drop-off or confusion | 10–25% | ≤ 2 days |
| 1 | Nice to have | < 10% | > 2 days |

A few rules override the score:

- A **privacy or security** issue always goes first, whatever its reach.
- A **blocker** in the core voting journey is fixed before lower-impact feature requests.
- Anything that changes the contract needs a redeploy, so contract changes are batched.

---

## Documented Engineering Improvements

The repository records the following iteration work:

| Commit | Change |
|---|---|
| `7ec42ea2cc98611101dbff5da071c2bfe0a8734c` | Persistent poll keys with backup and restore |
| `1a68cefe35a1ce3d7a31a8e5b71092745291edd8` | Centralized product links and SDK error translation |
| `a5ff2e6bb1993ba297c9d375c6bbc48588452064` | Plain-English usage guide |
| `7ef742ffb8fe89c82731090e2984c1d7802f48d9` | Deployment, privacy model and feedback-loop documentation |
| `dd16e2ef89a37a1b83fb9b4ae94c3cf867a419fc` | Feedback log structured around themes and changes |
| `d92c9af3c6d46e294ea9752799fbdebc48e1b41a` | User-list generation from chain state |
| `701f6cc60b290151eb5ed2e0b3ed512c95eb8067` | README and launch material |
| `075d78645ef8a8e0545ca62ac854ae88c5e862b3` | Vercel deployment documentation |
| `0aae3320c9be3d8cb1300452f274216b5de8c5e7` | Live application URL documentation |

---

## Privacy & Safety

BallotBox feedback collection must never request:

- seed phrases
- private keys
- wallet passwords
- private witnesses
- confidential ballot information

Collect only public identifiers and ordinary product feedback. If a tester pastes a secret
into an issue or form by mistake, delete it and ask them to rotate the affected key or wallet.

---

## Level 6 Snapshot

| Requirement | Status |
|---|---|
| MVP refined through feedback loop | Completed |
| 70+ feedback responses | 71 |
| Feedback ratings documented | Completed |
| Individual feedback log | Completed |
| Feedback themes | Completed |
| Product iteration documented | Completed |
| Updated documentation | Completed |
| Public repository | Available |
| Live demo | Available |

> Feedback-form responses and on-chain check-ins are separate measurements. A wallet address
> from the feedback form is not an on-chain verified participant unless it also appears in the
> contract's participant set (see [USERS.md](../USERS.md)).

---

## Final Summary

The September BallotBox feedback cycle produced **71 responses**, with an average rating of
**8.9 / 10** and a median of **9 / 10**.

The iteration work focused on reducing friction in onboarding, wallet connection, poll
lifecycle visibility, transaction feedback, tally verification and documentation, while
keeping BallotBox's privacy model intact.

```text
Test → Collect → Categorize → Prioritize → Implement → Re-test
```
