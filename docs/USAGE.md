# How to Use BallotBox

Plain-English instructions for someone who has never used a blockchain. The longer
walkthrough, including running your own poll and acting as a trustee, is the
[user guide](./USER_GUIDE.md).

- [What You Need](#what-you-need)
- [Getting Started on Preprod](#getting-started-on-preprod)
- [Your First Transaction](#your-first-transaction)
- [Step-by-Step Guide](#step-by-step-guide)
- [What Gets Proved (and What Stays Private)](#what-gets-proved-and-what-stays-private)
- [Troubleshooting](#troubleshooting)

## What You Need

| | |
|---|---|
| A desktop Chrome-based browser | Chrome, Brave or Edge |
| A Midnight wallet | [Lace (Midnight)](https://chromewebstore.google.com/detail/lace-midnight-preview/hgeekaiplokcnmakghbdfbgnlfheichg) or [1AM](https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp) |
| Free test tokens | tNIGHT from the [Preprod faucet](https://faucet.preprod.midnight.network/) — no real money, ever |
| About 10 minutes | Only the first time. Voting later takes about a minute |

## Getting Started on Preprod

Preprod is Midnight's test network. Its tokens have no value, so nothing here can cost you
anything.

1. **Install the wallet** and create one. Write the recovery phrase down.
2. **Switch the wallet to Preprod** in its settings.
3. **Get tokens.** Copy your unshielded address (it starts `mn_addr_preprod1…`), paste it
   into the [faucet](https://faucet.preprod.midnight.network/), and request tNIGHT.
4. **Generate DUST.** DUST pays transaction fees and is generated from your tNIGHT. In the
   wallet, choose the DUST option and wait 3–5 minutes for the balance to appear.
5. **Choose a proof server.** Every action creates a zero-knowledge proof, and your wallet
   sends it somewhere to be proved. Either select a hosted prover in the wallet settings, or
   run one locally with Docker:

   ```bash
   docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 midnight-proof-server -v
   ```

   Then set the wallet's proof server to `http://localhost:6300`.

You are ready when the wallet shows **Preprod**, **synced**, and a DUST balance above zero.

## Your First Transaction

1. Open the poll link you were given, or the featured poll on the home page. You can read
   the question and see the turnout **before** connecting anything.
2. Press **Connect wallet & take part** and approve the connection.
3. Press **Join this poll**. Approve it in the wallet. This is your first transaction: it
   adds an anonymous commitment to the voter roll. It takes about 30–120 seconds, because
   your browser is building a zero-knowledge proof.
4. When the wallet asks, approve. When the card says you are enrolled, you are on the roll —
   and nobody, including the organizer, can tell which entry is yours.

## Step-by-Step Guide

**To vote**

1. Wait until the stage bar reads **Vote**.
2. Choose **Yes**, **No** or **Abstain**.
3. Approve the transaction. The card shows a timer while the proof is built.
4. *"Your encrypted ballot is recorded"* means it is counted.
5. Changed your mind? Vote again before voting closes — only your last ballot counts.

**To be counted as a tester (optional)**

- Press **Count me as a tester**. This adds your wallet to a public list that is kept
  separate from ballots, so it never reveals how you voted.

**To run your own poll**

1. Press **Deploy a new poll contract**. Your wallet becomes the admin.
2. Press 🔑 → **Download backup** and keep the file. Without it, clearing your browser
   means you can never run another poll on that contract.
3. Fill in **Start a new poll**: question, voting window in hours, quorum, and whether
   enrollment is open to anyone with the link.
4. Press **Become a trustee** — a poll needs at least one before voting opens. For a
   stronger guarantee, ask independent people to register too.
5. Press **Open voting** and share the invite link (📤).
6. When you are done, press **Close voting and begin decryption**. Each trustee submits a
   share, and then anyone can publish the result.

## What Gets Proved (and What Stays Private)

| You prove | Without revealing |
|---|---|
| You are on the voter roll | Which entry on the roll is yours |
| You have not already voted | Any link between your ballot and your earlier one |
| Your ballot is a valid choice | Which choice you made |
| The published counts match the encrypted ballots | Any individual ballot |

Your secret key and your vote never leave your browser. What reaches the chain is an
encrypted ballot, a one-time nullifier, and a proof. The full threat model, including what
someone watching your network connection can infer, is in [PRIVACY.md](../PRIVACY.md).

## Troubleshooting

| What you see | What to do |
|---|---|
| *"Your wallet cannot pay the fee"* | You need DUST. Get tNIGHT from the faucet, generate DUST, wait a few minutes |
| *"Could not reach the proof server"* | Start the Docker proof server, or pick a hosted prover in the wallet settings |
| *"Wallet is still syncing"* in the wallet popup | Wait until it says synced. Approving during a sync fails |
| *"You are not on this poll's voter roll yet"* | Press **Join this poll** first. On invite-only polls, send your commitment to the organizer |
| *"Your wallet did not respond"* | Unlock the wallet, confirm it is on Preprod, reload the page |
| Proving takes more than 3 minutes | Normal on a slow machine for a vote; the timer keeps counting. Do not close the tab |
| You cleared your browser and lost your role | Restore your key backup with 🔑. Without a backup, the old role cannot be recovered |

Still stuck? [Open a feedback issue](https://github.com/SATISH-JALAN/private-pooling/issues/new?template=user-feedback.yml) —
every report is read, and what changes because of it is logged in [FEEDBACK.md](./FEEDBACK.md).
