# Launch kit — X profile and building in public

Ready-to-use copy for the product X profile (Level 4) and for recruiting and onboarding
Preprod testers (Levels 5–6). Replace every `<…>` before posting.

## 1. Create the product profile

| Field | Suggested value |
|---|---|
| Name | **BallotBox** |
| Handle | `@BallotBoxVote` (alternatives: `@BallotBoxZK`, `@ballotbox_mn`) |
| Bio (≤160) | `Private, verifiable polls on @MidnightNtwrk. Your ballot is encrypted, your eligibility is proven in zero knowledge, the result is checked on-chain. Live on Preprod 👇` |
| Website | `<vercel url>` |
| Location | `Midnight Preprod` |
| Avatar | `private-polling-ui/public/icon.png`, or a ballot-box glyph on purple `#7e57c2` |
| Header | `docs/screenshots/` landing page screenshot |
| Pinned post | Launch thread (below) |

After you create it:
- [ ] Add the URL to the GitHub variable `VITE_X_URL` and re-run *Deploy*
- [ ] Replace `@REPLACE_WITH_HANDLE` in `README.md`
- [ ] Put the X link in the repository's *About* section on GitHub

## 2. Launch thread (pin this)

**1/**
> Most online votes make you pick: trust a server with your ballot, or put it on a public
> chain forever.
>
> We built a third option on @MidnightNtwrk.
>
> Meet BallotBox 🗳️ private, verifiable polls, live on Preprod.
> <vercel url>

**2/**
> 🔒 Your ballot is encrypted before it leaves your browser. Nobody reads it — not other
> voters, not the organizer.
> 🕵️ A zero-knowledge proof shows you're on the voter roll without revealing which voter you are.

**3/**
> ✅ The result is checked on-chain against the encrypted ballots, so a dishonest organizer
> can't publish fake numbers.
> 🗝️ Decryption needs every trustee, so nobody can peek early.
> 🔁 Changed your mind, or pressured? Re-vote. Only your last ballot counts.

**4/**
> Try it in ~5 minutes:
> 1. Install Lace or 1AM, switch to Preprod
> 2. Grab free tNIGHT from the faucet
> 3. Open the featured poll → Join → Vote
> 4. Tap "Count me as a tester"
>
> Guide: <user guide link>

**5/**
> Building in public: code, contract, tests and CI are all open.
> <github link>
>
> Tell us what broke. Every piece of feedback gets read, and we post what we change because of it. 👇
> <feedback link>

## 3. Building-in-public cadence

| When | Post |
|---|---|
| Launch day | Launch thread (pinned) + 30–60 s screen recording of a vote |
| Weekly | Progress: tester count (from `export-participants`), one thing learned, one thing shipped |
| Each iteration | “You asked, we shipped” with a before/after GIF (see [FEEDBACK.md](./FEEDBACK.md)) |
| Milestones | 10 / 25 / 50 / 70 verified testers, with the export as proof |
| Technical deep-dive | “How do you count votes you can't read?” (ElGamal + ZK explainer thread) |

Tag `@MidnightNtwrk`; use `#Midnight #ZK #BuildInPublic`.

## 4. Tester recruitment messages

**Discord / Telegram (Midnight community, ZK groups, university clubs)**
> Hey! I'm testing BallotBox, anonymous voting on Midnight Preprod. It takes about 5 minutes,
> needs no real money, and your vote stays secret (it's encrypted and proven in ZK).
> Would you try one vote and tell me where you got stuck?
> 👉 <invite link> · guide: <user guide link>

**Direct message**
> Could you do me a 5-minute favour? I built a private voting dApp on Midnight's test
> network and need real people to try it. Open <invite link>, follow “New here?”, vote,
> tap “Count me as a tester”, then hit Feedback. Happy to help on a call if the wallet
> setup is confusing.

**Follow-up for people who started but didn't vote**
> Thanks for trying BallotBox! Where did it stop for you: wallet, tokens/DUST, proof
> server, or something else? That's exactly what I'm fixing next.

## 5. Onboarding session script (for live sessions or calls)

1. Share your screen and open the invite link: the preview shows the question with no wallet.
2. Install the wallet and switch to Preprod (2 min).
3. Faucet, then generate DUST. Explain it while waiting (3 min).
4. Proof server: hosted option or Docker.
5. Join the poll, then vote. Point out the timer: “this is the zero-knowledge proof”.
6. Count me as a tester, then Feedback form (1 min).
7. Ask: *“What almost made you give up?”* and log it in [FEEDBACK.md](./FEEDBACK.md).

## 6. Brand brief

**Tagline**
> Vote privately. Verify publicly.

**Three key messages**

1. **Your ballot is unreadable — to everyone.** Not "encrypted at rest" or "only staff can
   see it". The organizer holds no key that opens a single ballot, because no such key
   exists: decryption needs every trustee, and it opens only the total.
2. **Secrecy without taking the count on trust.** Anyone can re-derive the published result
   from public chain data (`npm run verify`) and confirm it matches the encrypted ballots.
   Most private voting tools ask you to believe the number.
3. **Coercion loses its grip.** You can re-vote until voting closes, and only your last
   ballot counts — so what someone watched you do proves nothing.

**Palette** — the app's own tokens, so the profile and product match. Deliberately not the
purple-on-black that every crypto product ships.

| Role | Hex | Use |
|---|---|---|
| Paper | `#f2efe8` | page ground, banner background |
| Ink | `#1d1c18` | headings, primary buttons, wordmark |
| Rule | `#dcd6c8` | hairlines, dividers |
| Affirm | `#2f6b4b` | yes, verified, success |
| Against | `#a33f2c` | no, errors |
| Caution | `#8a6012` | network label, warnings |

**X bio** (under 160 characters)
> Anonymous, verifiable polls on @MidnightNtwrk. Your ballot is encrypted; the result is
> checked on-chain. Live on Preprod — try a vote.

**Banner concept**
> A paper ballot slip on a plain `#f2efe8` ground, photographed square-on. The left half
> shows a filled-in checkbox; the right half shows the same slip with the mark replaced by
> a short hash in mono type, ink on paper. One line of text between them: *"the chain sees
> the right-hand side."* No glow, no gradient, no 3D crypto imagery.

## 7. Three standalone posts (Level 4)

Use these if a thread is too much — one per day works well.

**Post 1 — what it is, and why Midnight**
> Online votes make you choose: trust a server with your ballot, or publish it on a chain
> forever.
>
> BallotBox does neither. Ballots are encrypted in your browser; eligibility is proven in
> zero knowledge on @MidnightNtwrk.
>
> Live on Preprod 👇 <vercel url>

**Post 2 — the technical insight**
> How do you count votes you can't read?
>
> Each ballot is an exponential ElGamal ciphertext on Jubjub. Adding ciphertexts adds the
> votes underneath. The chain holds a running total nobody can open until every trustee
> submits a share — and `publishTally` re-encrypts the claimed counts in-circuit and
> rejects them if they don't match. #ZK

**Post 3 — call to try it**
> Looking for testers 🗳️
>
> 5 minutes, free test tokens, no real money. Vote in a poll where nobody — including me —
> can read your ballot, then check the result yourself with one command.
>
> <vercel url>
> Guide: <user guide link>
