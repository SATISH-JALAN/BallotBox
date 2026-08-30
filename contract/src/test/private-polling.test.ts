import { describe, expect, it } from "vitest";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  ledger,
  pureCircuits,
  PollState,
} from "../managed/private-polling/contract/index.js";
import {
  witnesses,
  createPrivatePollingPrivateState,
  type PrivatePollingPrivateState,
} from "../witnesses";

// A dummy coin public key — only used to seed the local Zswap state that circuit
// execution requires; it has no bearing on the poll/voting logic under test.
const COIN_PUBLIC_KEY = "0".repeat(64);
const ZERO_SEQUENCE = new Uint8Array(32);

const secretKey = (byte: number): Uint8Array => new Uint8Array(32).fill(byte);
const OWNER = secretKey(1);

/** 0 disables the on-chain voting deadline / quorum requirement. */
const NO_DEADLINE = 0n;
const NO_QUORUM = 0n;

type Ctx = CircuitContext<PrivatePollingPrivateState>;

const contract = new Contract(witnesses);

const deploy = (secret: Uint8Array): Ctx => {
  const constructorResult = contract.initialState(
    createConstructorContext(
      createPrivatePollingPrivateState(secret),
      COIN_PUBLIC_KEY,
    ),
  );
  return createCircuitContext(
    sampleContractAddress(),
    COIN_PUBLIC_KEY,
    constructorResult.currentContractState,
    constructorResult.currentPrivateState,
  );
};

const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex");

/** Rebinds private state so circuits run as `secret`, optionally staging a ballot. */
const as = (context: Ctx, secret: Uint8Array, choice?: number): Ctx => ({
  ...context,
  currentPrivateState: createPrivatePollingPrivateState(secret, choice),
});

const state = (context: Ctx) => ledger(context.currentQueryContext.state);

/**
 * Drives a poll to OPEN with `voters` enrolled and `trustees` registered.
 *
 * A trustee is now required: without one there is no joint key to encrypt ballots to.
 * Defaults to the organizer acting as sole trustee, which is the single-party case.
 */
const openPollWith = (
  voters: Uint8Array[],
  question = "Q",
  deadline = NO_DEADLINE,
  quorum = NO_QUORUM,
  trustees: Uint8Array[] = [OWNER],
): Ctx => {
  let ctx = contract.impureCircuits.createPoll(
    deploy(OWNER),
    question,
    deadline,
    quorum,
  ).context;
  for (const t of trustees) {
    ctx = contract.impureCircuits.registerTrustee(as(ctx, t)).context;
  }
  for (const v of voters) {
    ctx = contract.impureCircuits.enrollVoter(
      as(ctx, OWNER),
      pureCircuits.voterCommitment(v),
    ).context;
  }
  return contract.impureCircuits.openVoting(as(ctx, OWNER)).context;
};

const openPollWithOptions = (
  voters: Uint8Array[],
  deadline: bigint,
  quorum: bigint,
): Ctx => openPollWith(voters, "Q", deadline, quorum);

const voteAs = (context: Ctx, secret: Uint8Array, choice: number): Ctx =>
  contract.impureCircuits.castVote(as(context, secret, choice)).context;

/** Closes voting and collects every trustee's decryption share. */
const collectShares = (
  context: Ctx,
  trustees: Uint8Array[] = [OWNER],
  closer = OWNER,
): Ctx => {
  let ctx = contract.impureCircuits.closeVoting(as(context, closer)).context;
  for (const t of trustees) {
    ctx = contract.impureCircuits.submitDecryptionShare(as(ctx, t)).context;
  }
  return ctx;
};

/** Full close -> shares -> publish path. */
const publish = (
  context: Ctx,
  yes: bigint,
  no: bigint,
  abstain: bigint,
  trustees: Uint8Array[] = [OWNER],
): Ctx =>
  contract.impureCircuits.publishTally(
    as(collectShares(context, trustees), OWNER),
    yes,
    no,
    abstain,
  ).context;

describe("private-polling contract", () => {
  it("derivedPublicKey is deterministic, and differs across secret keys", () => {
    const a = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    const b = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    const c = pureCircuits.derivedPublicKey(secretKey(2), ZERO_SEQUENCE);
    expect(hex(a)).toEqual(hex(b));
    expect(hex(a)).not.toEqual(hex(c));
  });

  it("deploys closed, untallied, with no question", () => {
    const s = state(deploy(OWNER));
    expect(s.pollState).toEqual(PollState.CLOSED);
    expect(s.pollQuestion.is_some).toBe(false);
    expect(s.tallied).toBe(false);
    expect(s.ballotCount).toEqual(0n);
  });

  it("createPoll enters REGISTRATION and discloses only a hashed owner", () => {
    const after = contract.impureCircuits.createPoll(
      deploy(OWNER),
      "Should we ship v2?",
      NO_DEADLINE,
      NO_QUORUM,
    ).context;
    const s = state(after);
    expect(s.pollState).toEqual(PollState.REGISTRATION);
    expect(s.pollQuestion).toEqual({
      is_some: true,
      value: "Should we ship v2?",
    });
    expect(s.owner).toHaveLength(32);
    expect(hex(s.owner)).not.toEqual(hex(OWNER));
  });

  it("rejects votes while still in REGISTRATION — the roll must be frozen first", () => {
    const voter = secretKey(11);
    let ctx = contract.impureCircuits.createPoll(
      deploy(OWNER),
      "Q",
      NO_DEADLINE,
      NO_QUORUM,
    ).context;
    ctx = contract.impureCircuits.enrollVoter(
      as(ctx, OWNER),
      pureCircuits.voterCommitment(voter),
    ).context;
    expect(() => voteAs(ctx, voter, 0)).toThrow();
  });

  it("rejects opening a second poll while one is already in progress", () => {
    const ctx = contract.impureCircuits.createPoll(
      deploy(OWNER),
      "Q1",
      NO_DEADLINE,
      NO_QUORUM,
    ).context;
    expect(() =>
      contract.impureCircuits.createPoll(
        as(ctx, OWNER),
        "Q2",
        NO_DEADLINE,
        NO_QUORUM,
      ),
    ).toThrow();
  });

  it("only the creator can enroll voters or open voting", () => {
    const impostor = secretKey(99);
    let ctx = contract.impureCircuits.createPoll(
      deploy(OWNER),
      "Q",
      NO_DEADLINE,
      NO_QUORUM,
    ).context;
    ctx = contract.impureCircuits.registerTrustee(as(ctx, OWNER)).context;

    expect(() =>
      contract.impureCircuits.enrollVoter(
        as(ctx, impostor),
        pureCircuits.voterCommitment(secretKey(11)),
      ),
    ).toThrow();
    expect(() =>
      contract.impureCircuits.openVoting(as(ctx, impostor)),
    ).toThrow();
  });

  it("voting cannot open before a decryption trustee exists", () => {
    // Without a trustee there is no joint key to encrypt ballots to.
    const ctx = contract.impureCircuits.createPoll(
      deploy(OWNER),
      "Q",
      NO_DEADLINE,
      NO_QUORUM,
    ).context;
    expect(() => contract.impureCircuits.openVoting(as(ctx, OWNER))).toThrow();
  });
});

describe("encrypted tally", () => {
  it("decrypts to the exact counts that were voted", () => {
    const voters = [11, 12, 13, 14, 15].map(secretKey);
    let ctx = openPollWith(voters);
    ctx = voteAs(ctx, voters[0], 0); // yes
    ctx = voteAs(ctx, voters[1], 0); // yes
    ctx = voteAs(ctx, voters[2], 1); // no
    ctx = voteAs(ctx, voters[3], 2); // abstain
    ctx = voteAs(ctx, voters[4], 0); // yes

    expect(state(ctx).ballotCount).toEqual(5n);
    // Nothing is readable before the organizer publishes.
    expect(state(ctx).tallied).toBe(false);
    expect(state(ctx).finalYes).toEqual(0n);

    const done = publish(ctx, 3n, 1n, 1n);
    const s = state(done);
    expect(s.tallied).toBe(true);
    expect(s.finalYes).toEqual(3n);
    expect(s.finalNo).toEqual(1n);
    expect(s.finalAbstain).toEqual(1n);
    expect(s.pollState).toEqual(PollState.CLOSED);
  });

  it("rejects a tally that does not match the ballots actually cast", () => {
    const voters = [11, 12, 13].map(secretKey);
    let ctx = openPollWith(voters);
    ctx = voteAs(ctx, voters[0], 0);
    ctx = voteAs(ctx, voters[1], 1);
    ctx = voteAs(ctx, voters[2], 1);

    // Truth is 1 yes / 2 no. An organizer trying to flip the result is caught by the
    // re-encryption check, which is what makes the published tally trustworthy.
    expect(() => publish(ctx, 3n, 0n, 0n)).toThrow();
    expect(() => publish(ctx, 2n, 1n, 0n)).toThrow();
    expect(() => publish(ctx, 0n, 0n, 0n)).toThrow();

    const done = publish(ctx, 1n, 2n, 0n);
    expect(state(done).finalNo).toEqual(2n);
  });

  it("an empty poll tallies to all zeros", () => {
    const ctx = openPollWith([secretKey(11)]);
    const done = publish(ctx, 0n, 0n, 0n);
    expect(state(done).tallied).toBe(true);
    expect(state(done).finalYes).toEqual(0n);
  });

  it("two identical choices produce different ciphertext contributions", () => {
    // Fresh randomness per ballot: without it, equal choices would encrypt identically
    // and an observer could group voters by how they voted.
    const voters = [11, 12].map(secretKey);
    const open = openPollWith(voters);

    const afterFirst = voteAs(open, voters[0], 0);
    const c1AfterFirst = state(afterFirst).encTallyC1;
    const afterSecond = voteAs(afterFirst, voters[1], 0);
    const c1AfterSecond = state(afterSecond).encTallyC1;

    // Same choice, but the accumulator moved by a different blinded value both times.
    expect(c1AfterFirst).not.toEqual(c1AfterSecond);
    expect(state(afterSecond).ballotCount).toEqual(2n);
  });
});

/**
 * Tracks the gap between this contract and a fully anonymous ballot.
 *
 * `CLOSED:` tests assert a gap that has been fixed, and guard against regressing.
 * `GAP (open):` tests assert behaviour that is still wrong — written as passing
 * assertions of the status quo, so that the work which fixes them has to change this
 * file, and cannot land silently.
 *
 * See ../../PRIVACY.md and ../DESIGN-V2.md.
 */
describe("organizer controls", () => {
  it("records the deadline and quorum set at creation", () => {
    const ctx = openPollWithOptions([secretKey(11)], 9999999999n, 5n);
    const s = state(ctx);
    expect(s.votingDeadline).toEqual(9999999999n);
    expect(s.quorum).toEqual(5n);
    expect(s.quorumMet).toBe(false);
  });

  it("rejects ballots once the voting deadline has passed", () => {
    // A deadline of 1 (one second past the epoch) is unreachable in the past, so every
    // ballot is late. The chain enforces this — the organizer cannot extend voting after
    // seeing how it is going.
    const voter = secretKey(11);
    const ctx = openPollWithOptions([voter], 1n, 0n);
    expect(() => voteAs(ctx, voter, 0)).toThrow();
  });

  it("accepts ballots before the deadline", () => {
    const voter = secretKey(11);
    const ctx = openPollWithOptions([voter], 99999999999999n, 0n);
    const after = voteAs(ctx, voter, 0);
    expect(state(after).ballotCount).toEqual(1n);
  });

  it("flags a poll that fails to reach quorum, without hiding the numbers", () => {
    const voters = [11, 12].map(secretKey);
    let ctx = openPollWithOptions(voters, 0n, 5n); // needs 5, will get 2
    ctx = voteAs(ctx, voters[0], 0);
    ctx = voteAs(ctx, voters[1], 0);

    const done = publish(ctx, 2n, 0n, 0n);
    expect(state(done).tallied).toBe(true);
    expect(state(done).finalYes).toEqual(2n);
    // The result is published but explicitly marked as not binding.
    expect(state(done).quorumMet).toBe(false);
  });

  it("marks quorum met once enough ballots are cast", () => {
    const voters = [11, 12].map(secretKey);
    let ctx = openPollWithOptions(voters, 0n, 2n);
    ctx = voteAs(ctx, voters[0], 0);
    ctx = voteAs(ctx, voters[1], 1);

    const done = publish(ctx, 1n, 1n, 0n);
    expect(state(done).quorumMet).toBe(true);
  });
});

describe("threshold decryption", () => {
  const TRUSTEES = [secretKey(31), secretKey(32), secretKey(33)];

  it("decrypts correctly when every trustee contributes a share", () => {
    const voters = [11, 12, 13].map(secretKey);
    let ctx = openPollWith(voters, "Q", NO_DEADLINE, NO_QUORUM, TRUSTEES);
    expect(state(ctx).trusteeCount).toEqual(3n);

    ctx = voteAs(ctx, voters[0], 0);
    ctx = voteAs(ctx, voters[1], 0);
    ctx = voteAs(ctx, voters[2], 1);

    const done = publish(ctx, 2n, 1n, 0n, TRUSTEES);
    expect(state(done).finalYes).toEqual(2n);
    expect(state(done).finalNo).toEqual(1n);
  });

  it("cannot publish until every trustee has submitted — one holdout seals the result", () => {
    // This is the whole point of n-of-n: a single honest trustee refusing to collude
    // keeps the tally sealed, so no coalition short of everyone can open it.
    const voters = [11, 12].map(secretKey);
    let ctx = openPollWith(voters, "Q", NO_DEADLINE, NO_QUORUM, TRUSTEES);
    ctx = voteAs(ctx, voters[0], 0);
    ctx = voteAs(ctx, voters[1], 0);

    // Only two of the three trustees cooperate.
    const partial = collectShares(ctx, [TRUSTEES[0], TRUSTEES[1]]);
    expect(state(partial).shareCount).toEqual(2n);
    expect(state(partial).trusteeCount).toEqual(3n);
    expect(() =>
      contract.impureCircuits.publishTally(as(partial, OWNER), 2n, 0n, 0n),
    ).toThrow();
  });

  it("rejects a share that does not match the trustee's registered key", () => {
    const voters = [secretKey(11)];
    let ctx = openPollWith(voters, "Q", NO_DEADLINE, NO_QUORUM, TRUSTEES);
    ctx = voteAs(ctx, voters[0], 0);
    ctx = contract.impureCircuits.closeVoting(as(ctx, OWNER)).context;

    // A wallet that never registered has no entry to match against.
    expect(() =>
      contract.impureCircuits.submitDecryptionShare(as(ctx, secretKey(99))),
    ).toThrow();
  });

  it("rejects a duplicate share from the same trustee", () => {
    const voters = [secretKey(11)];
    let ctx = openPollWith(voters, "Q", NO_DEADLINE, NO_QUORUM, TRUSTEES);
    ctx = voteAs(ctx, voters[0], 0);
    ctx = contract.impureCircuits.closeVoting(as(ctx, OWNER)).context;
    ctx = contract.impureCircuits.submitDecryptionShare(
      as(ctx, TRUSTEES[0]),
    ).context;

    expect(() =>
      contract.impureCircuits.submitDecryptionShare(as(ctx, TRUSTEES[0])),
    ).toThrow();
    expect(state(ctx).shareCount).toEqual(1n);
  });

  it("a wrong tally is rejected even with all shares present", () => {
    const voters = [11, 12].map(secretKey);
    let ctx = openPollWith(voters, "Q", NO_DEADLINE, NO_QUORUM, TRUSTEES);
    ctx = voteAs(ctx, voters[0], 1);
    ctx = voteAs(ctx, voters[1], 1);

    const ready = collectShares(ctx, TRUSTEES);
    expect(() =>
      contract.impureCircuits.publishTally(as(ready, OWNER), 2n, 0n, 0n),
    ).toThrow();
    const done = contract.impureCircuits.publishTally(
      as(ready, OWNER),
      0n,
      2n,
      0n,
    ).context;
    expect(state(done).finalNo).toEqual(2n);
  });

  it("publishing is permissionless once the shares are in", () => {
    // The organizer is not a gatekeeper on the result being seen: once every share is
    // submitted the combined value is public, so anyone can publish the matching counts.
    const voters = [secretKey(11)];
    let ctx = openPollWith(voters, "Q", NO_DEADLINE, NO_QUORUM, TRUSTEES);
    ctx = voteAs(ctx, voters[0], 2);

    const ready = collectShares(ctx, TRUSTEES);
    const stranger = secretKey(123);
    const done = contract.impureCircuits.publishTally(
      as(ready, stranger),
      0n,
      0n,
      1n,
    ).context;
    expect(state(done).tallied).toBe(true);
    expect(state(done).finalAbstain).toEqual(1n);
  });

  it("ballots cannot be cast once voting has closed for tallying", () => {
    const voters = [11, 12].map(secretKey);
    let ctx = openPollWith(voters, "Q", NO_DEADLINE, NO_QUORUM, TRUSTEES);
    ctx = voteAs(ctx, voters[0], 0);
    ctx = contract.impureCircuits.closeVoting(as(ctx, OWNER)).context;
    expect(() => voteAs(ctx, voters[1], 0)).toThrow();
  });
});

describe("anonymous-ballot gaps", () => {
  it("CLOSED: one credential contributes exactly one counted ballot", () => {
    // Re-voting is allowed (see coercion resistance below), but it replaces rather than
    // adds — a credential can never contribute two ballots to the tally.
    const voter = secretKey(11);
    let ctx = openPollWith([voter]);
    ctx = voteAs(ctx, voter, 0);
    expect(state(ctx).ballotCount).toEqual(1n);

    ctx = voteAs(ctx, voter, 0);
    ctx = voteAs(ctx, voter, 0);
    expect(state(ctx).ballotCount).toEqual(1n);

    const done = publish(ctx, 1n, 0n, 0n);
    expect(state(done).finalYes).toEqual(1n);
  });

  it("CLOSED: a key that was never enrolled cannot vote", () => {
    const ctx = openPollWith([secretKey(11)]);
    expect(() => voteAs(ctx, secretKey(77), 0)).toThrow();
    expect(state(ctx).ballotCount).toEqual(0n);
  });

  it("CLOSED: an out-of-range choice is rejected even though it is private", () => {
    // The choice is a witness, so it is never public — but the circuit still constrains
    // it. Without that, an encrypted ballot could smuggle in a weight of 500.
    const voter = secretKey(11);
    const ctx = openPollWith([voter]);
    expect(() => voteAs(ctx, voter, 7)).toThrow();
  });

  it("CLOSED: individual choices are not readable from the ledger", () => {
    const voter = secretKey(11);
    const after = voteAs(openPollWith([voter]), voter, 1); // votes No

    // With one ballot cast, the old design's per-choice counters would have identified
    // this voter's choice exactly. There are no such counters now — only an encrypted
    // aggregate and a turnout count.
    const s = after.currentQueryContext.state;
    const l = state(after);
    expect(l.ballotCount).toEqual(1n);
    expect(l.tallied).toBe(false);
    expect(l.finalNo).toEqual(0n);
    expect(Object.keys(l)).not.toContain("noVotes");
    expect(s).toBeDefined();
  });

  it("CLOSED: nullifiers are unlinkable to identity hash or commitment", () => {
    const voter = secretKey(11);
    const after = voteAs(openPollWith([voter]), voter, 0);

    const [[nullifier]] = [...state(after).priorBallotC1];
    expect(hex(nullifier)).not.toEqual(hex(voter));
    expect(hex(nullifier)).not.toEqual(
      hex(pureCircuits.derivedPublicKey(voter, ZERO_SEQUENCE)),
    );
    expect(hex(nullifier)).not.toEqual(
      hex(pureCircuits.voterCommitment(voter)),
    );
  });

  it("CLOSED: re-voting replaces the earlier ballot, so a receipt proves nothing", () => {
    // A voter coerced into voting Yes can quietly overwrite it with No. Because only the
    // last ballot counts, whatever they showed the briber at the time is worthless.
    const voter = secretKey(11);
    let ctx = openPollWith([voter]);
    ctx = voteAs(ctx, voter, 0); // coerced Yes
    ctx = voteAs(ctx, voter, 1); // quietly overridden to No

    // Still one voter, not two.
    expect(state(ctx).ballotCount).toEqual(1n);

    // And the tally reflects only the final choice.
    const done = publish(ctx, 0n, 1n, 0n);
    expect(state(done).finalYes).toEqual(0n);
    expect(state(done).finalNo).toEqual(1n);
  });

  it("CLOSED: an override cannot inflate the tally", () => {
    // Overriding must remove the old contribution, not stack on top of it — otherwise
    // one voter could vote repeatedly and swamp the result.
    const voters = [11, 12].map(secretKey);
    let ctx = openPollWith(voters);
    ctx = voteAs(ctx, voters[0], 0);
    ctx = voteAs(ctx, voters[1], 1);
    ctx = voteAs(ctx, voters[0], 0); // same choice again
    ctx = voteAs(ctx, voters[0], 2); // and again, changing choice

    expect(state(ctx).ballotCount).toEqual(2n);
    // Voter 0 ends on Abstain, voter 1 on No. Anything else means the old ballot was
    // not properly subtracted.
    const done = publish(ctx, 0n, 1n, 1n);
    expect(state(done).finalYes).toEqual(0n);
    expect(state(done).finalNo).toEqual(1n);
    expect(state(done).finalAbstain).toEqual(1n);
  });

  it("GAP (open): a coercer can still observe *that* a voter overrode", () => {
    // The nullifier key reappears in the ledger map when a ballot is replaced, so a
    // briber demanding \"vote X and do not re-vote\" can verify the second half of that
    // instruction. Hiding whether an override happened needs every ballot transaction to
    // look identical, which this design does not yet do.
    const voter = secretKey(11);
    let ctx = openPollWith([voter]);
    ctx = voteAs(ctx, voter, 0);
    const before = state(ctx).priorBallotC1.lookup(
      pureCircuits.voteNullifier(voter, state(ctx).pollId),
    );
    ctx = voteAs(ctx, voter, 1);
    const after = state(ctx).priorBallotC1.lookup(
      pureCircuits.voteNullifier(voter, state(ctx).pollId),
    );
    // The stored ciphertext visibly changed — that fact alone is observable.
    expect(before).not.toEqual(after);
  });
});
