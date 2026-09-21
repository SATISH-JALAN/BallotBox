# BallotBox user guide

This guide takes you from nothing installed to a cast vote in about 10 minutes. No
blockchain experience is needed.

**Live app:** <https://private-pooling.vercel.app> · **Stuck?** [Leave feedback](https://github.com/SATISH-JALAN/private-pooling/issues/new?template=user-feedback.yml)

- [What you need](#what-you-need)
- [Step 1 — Install a wallet](#step-1--install-a-wallet)
- [Step 2 — Get free test tokens](#step-2--get-free-test-tokens)
- [Step 3 — Set up proving](#step-3--set-up-proving)
- [Step 4 — Join a poll and vote](#step-4--join-a-poll-and-vote)
- [Step 5 — Check in and tell us how it went](#step-5--check-in-and-tell-us-how-it-went)
- [Running your own poll](#running-your-own-poll)
- [Being a trustee](#being-a-trustee)
- [Your key and backups](#your-key-and-backups)
- [What is private and what is public](#what-is-private-and-what-is-public)
- [FAQ](#faq)

---

## What you need

- A desktop **Chrome-based browser** (Chrome, Brave or Edge).
- About **10 minutes** the first time.
- Nothing else. Preprod is Midnight's test network, and its tokens are free and have no value.

## Step 1 — Install a wallet

1. Install **[Lace (Midnight)](https://chromewebstore.google.com/detail/lace-midnight-preview/hgeekaiplokcnmakghbdfbgnlfheichg)**
   or **[1AM](https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp)**.
2. Create a new wallet and **write down the recovery phrase**.
3. In the wallet settings, switch the network to **Preprod**.
4. Reload BallotBox. Step 1 in the *“New here?”* panel turns green once the wallet is detected.

## Step 2 — Get free test tokens

Midnight uses two tokens:

- **tNIGHT**, which you hold.
- **DUST**, which pays transaction fees. It is generated from your tNIGHT over time.

1. In your wallet, copy your **unshielded address** (it starts `mn_addr_preprod1…`).
2. Paste it into the **[Preprod faucet](https://faucet.preprod.midnight.network/)** and request tokens.
3. In the wallet, **generate DUST** from your tNIGHT (it may be called “register for DUST”).
4. Wait **3–5 minutes** for the DUST balance to show up.

## Step 3 — Set up proving

Every BallotBox action creates a zero-knowledge proof. Your wallet sends it to a **proof server**:

- **Easiest:** if your wallet settings offer a hosted or remote prover, select it.
- **Local:** install [Docker](https://www.docker.com/products/docker-desktop/) and run the
  command below, then set the wallet's proof server to `http://localhost:6300`.

  ```bash
  docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 midnight-proof-server -v
  ```

## Step 4 — Join a poll and vote

1. Open the invite link you were given, or use the **featured poll** on the home page. You
   can see the question and turnout before connecting.
2. Press **Connect wallet & take part** and approve the connection in your wallet.
3. The progress bar at the top of the card shows the poll's stage: **Enrol → Vote → Decrypt → Result**.
4. Press **Join this poll** and approve the transaction. This adds an anonymous commitment to the voter roll.
   - Invite-only poll? You'll see **your enrolment commitment** instead. Copy it and send it
     to the organizer.
5. When the stage is **Vote**, choose **Yes**, **No** or **Abstain**. Proving takes about
   **30–120 seconds**, and the card shows a timer. Approve the transaction when your wallet asks.
6. The message *“Your encrypted ballot is recorded”* confirms your vote.

**Changed your mind?** Vote again before voting closes. Only your last ballot counts.

## Step 5 — Check in and tell us how it went

- **Count me as a tester** adds your wallet to the public tester list. This is how the
  project proves real people used it. It is separate from your ballot and never reveals how
  you voted. It is optional.
- **Feedback** (bottom-right button) opens a short form. Every response is read. See
  [how feedback is used](./FEEDBACK.md).

---

## Running your own poll

1. On the home page, choose **Deploy a new poll contract** and approve it. Your wallet
   becomes the **admin** of that contract.
2. Press 🔑 on the card, then **Download backup**. Without that file, clearing your
   browser means you can never run another poll on this contract.
3. Fill in **Start a new poll**:
   - **Voting window (hours):** voting stops automatically on-chain. Leave it blank for no deadline.
   - **Quorum:** the minimum number of ballots for a binding result. The result is still published if it isn't reached, but it is flagged.
   - **Open enrollment:** *on* lets anyone with the link join (good for community polls).
     *Off* means you enrol each voter (good for binding votes, where one person must not
     be able to join twice).
4. Press **Become a trustee**. At least one trustee is required. For a stronger guarantee,
   ask other people to register too.
5. For invite-only polls, paste voters' commitments (one per line) and press **Enrol voters**.
6. Press **Open voting**, then share the invite link (📤 on the card).
7. When you're done, press **Close voting and begin decryption**. After the deadline,
   anyone can do this.

## Being a trustee

Trustees jointly hold the key that opens the result. No single trustee, including the
organizer, can decrypt early.

- Register **before voting opens** with **Become a trustee**.
- **Back up your key** (🔑). A trustee who loses their key blocks the result permanently.
- After voting closes, press **Submit my decryption share**.
- Once every trustee has submitted, **anyone** can press **Publish the result**. The
  contract checks that the counts match the encrypted ballots.

## Your key and backups

BallotBox creates a secret key **per poll, in your browser**. It proves that you're
enrolled, that you're the organizer, or that you're a trustee. It never leaves your device.

- It survives page reloads.
- It is lost if you clear site data, use a private window, or switch browser or computer.
- 🔑 → **Download backup** saves it to a file. 🔑 → **Restore from file** loads it into another browser.
- **Treat the backup file like a password.** Anyone holding it can act as you on that poll.

## What is private and what is public

| Private | Public |
|---|---|
| How you voted | The question, stage, deadline and quorum |
| Which voter on the roll you are | How many people enrolled and voted |
| Your secret key | Final counts, once every trustee has contributed |
| | Wallets that chose to **check in** as testers |

The full threat model is in [PRIVACY.md](../PRIVACY.md).

---

## FAQ

**Why does voting take a minute or two?**
Your browser and proof server build a zero-knowledge proof that you're eligible and that
your encrypted ballot is valid, without revealing either. That work is what keeps the vote private.

**It says “Your wallet cannot pay the fee”.**
You need DUST. Get tNIGHT from the faucet, generate DUST in the wallet, and wait a few minutes.

**It says “Could not reach the proof server”.**
Start the Docker proof server (Step 3) or select a hosted prover in your wallet settings.

**It says “You are not on this poll’s voter roll yet”.**
Press **Join this poll** first. On invite-only polls, the organizer has to enrol your commitment.

**Can the organizer see my vote?**
No. Ballots are encrypted to a key that needs every trustee's share, and even then only
the *total* is opened. Individual ballots are never decrypted.

**Can someone see that I voted?**
Anyone can see how many ballots were cast. They can't tell which enrolled voter cast one.
Someone who watches your internet connection could see that you sent a transaction. Use a
VPN or Tor if that matters to you.

**I cleared my browser and lost my role.**
Restore your key backup with 🔑. Without a backup, a new key is created and the old role
can't be recovered.

**Does checking in link my wallet to my vote?**
No. The tester list is a separate on-chain set. No voting step reads or writes it, and it
stores your wallet key, not anything derived from your ballot credential.
