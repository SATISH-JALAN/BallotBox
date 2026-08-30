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

const deploy = (
  secret: Uint8Array,
): CircuitContext<PrivatePollingPrivateState> => {
  const contract = new Contract(witnesses);
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

/**
 * Casts a ballot as the holder of `secret`, by swapping the private state the
 * `localSecretKey` witness reads from. Each distinct secret is a distinct voter, and
 * therefore a distinct nullifier.
 */
const voteAs = (
  context: CircuitContext<PrivatePollingPrivateState>,
  secret: Uint8Array,
  choice: bigint,
): CircuitContext<PrivatePollingPrivateState> =>
  new Contract(witnesses).impureCircuits.castVote(
    {
      ...context,
      currentPrivateState: createPrivatePollingPrivateState(secret),
    },
    choice,
  ).context;

describe("private-polling contract", () => {
  const contract = new Contract(witnesses);

  it("derivedPublicKey is deterministic for a given secret key", () => {
    const a = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    const b = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    expect(hex(a)).toEqual(hex(b));
  });

  it("derivedPublicKey differs across secret keys, so no two voters share an identity hash", () => {
    const a = pureCircuits.derivedPublicKey(secretKey(1), ZERO_SEQUENCE);
    const b = pureCircuits.derivedPublicKey(secretKey(2), ZERO_SEQUENCE);
    expect(hex(a)).not.toEqual(hex(b));
  });

  it("deploys closed, with no question and zeroed tallies", () => {
    const context = deploy(secretKey(1));
    const state = ledger(context.currentQueryContext.state);
    expect(state.pollState).toEqual(PollState.CLOSED);
    expect(state.pollQuestion.is_some).toBe(false);
    expect(state.yesVotes).toEqual(0n);
    expect(state.noVotes).toEqual(0n);
    expect(state.abstainVotes).toEqual(0n);
  });

  it("createPoll opens the poll and discloses only a hashed owner (never the secret key)", () => {
    const context = deploy(secretKey(1));
    const { context: after } = contract.impureCircuits.createPoll(
      context,
      "Should we ship v2?",
    );
    const state = ledger(after.currentQueryContext.state);
    expect(state.pollState).toEqual(PollState.OPEN);
    expect(state.pollQuestion).toEqual({
      is_some: true,
      value: "Should we ship v2?",
    });
    // The disclosed owner is a 32-byte hash, not the raw secret key.
    expect(state.owner).toHaveLength(32);
    expect(hex(state.owner)).not.toEqual(hex(secretKey(1)));
  });

  it("createPoll derives the same owner hash for the same secret key, and a different one for another", () => {
    const ownerFor = (secret: Uint8Array): string => {
      const { context: after } = contract.impureCircuits.createPoll(
        deploy(secret),
        "Q",
      );
      return hex(ledger(after.currentQueryContext.state).owner);
    };
    expect(ownerFor(secretKey(1))).toEqual(ownerFor(secretKey(1)));
    expect(ownerFor(secretKey(1))).not.toEqual(ownerFor(secretKey(2)));
  });

  it("castVote tallies one ballot per distinct voter", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");

    // Four different voters — each needs its own secret key, since a key may now
    // only be spent once per poll.
    const afterYes1 = voteAs(afterCreate.context, secretKey(11), 0n);
    const afterYes2 = voteAs(afterYes1, secretKey(12), 0n);
    const afterNo = voteAs(afterYes2, secretKey(13), 1n);
    const afterAbstain = voteAs(afterNo, secretKey(14), 2n);

    const state = ledger(afterAbstain.currentQueryContext.state);
    expect(state.yesVotes).toEqual(2n);
    expect(state.noVotes).toEqual(1n);
    expect(state.abstainVotes).toEqual(1n);
    // One nullifier recorded per ballot, and nothing else.
    expect(state.spentNullifiers.size()).toEqual(4n);
  });

  it("rejects an out-of-range vote choice", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");
    expect(() =>
      contract.impureCircuits.castVote(afterCreate.context, 3n),
    ).toThrow();
  });

  it("rejects votes once the poll is closed", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");
    const afterClose = contract.impureCircuits.closePoll(afterCreate.context);
    expect(() =>
      contract.impureCircuits.castVote(afterClose.context, 0n),
    ).toThrow();
  });

  it("rejects opening a second poll while one is already open", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q1");
    expect(() =>
      contract.impureCircuits.createPoll(afterCreate.context, "Q2"),
    ).toThrow();
  });

  it("only the creator holding the matching secret key can close the poll", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");

    const impostorContext: CircuitContext<PrivatePollingPrivateState> = {
      ...afterCreate.context,
      currentPrivateState: createPrivatePollingPrivateState(secretKey(2)),
    };
    expect(() => contract.impureCircuits.closePoll(impostorContext)).toThrow();

    const { context: closed } = contract.impureCircuits.closePoll(
      afterCreate.context,
    );
    expect(ledger(closed.currentQueryContext.state).pollState).toEqual(
      PollState.CLOSED,
    );
  });
});

/**
 * Tracks the gap between this contract and a real anonymous ballot.
 *
 * `CLOSED:` tests assert a gap that has been fixed, and guard against regressing.
 * `GAP (open):` tests assert behaviour that is still wrong — written as passing
 * assertions of the status quo, so that the work which fixes them has to change this
 * file, and cannot land silently.
 *
 * See ../../PRIVACY.md and ../DESIGN-V2.md.
 */
describe("anonymous-ballot gaps — Level 4 scope", () => {
  const contract = new Contract(witnesses);

  it("CLOSED: a second ballot from the same key is rejected by the nullifier set", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");

    const afterFirst = voteAs(afterCreate.context, secretKey(11), 0n);
    expect(ledger(afterFirst.currentQueryContext.state).yesVotes).toEqual(1n);

    // Same key, same poll — the nullifier is already spent.
    expect(() => voteAs(afterFirst, secretKey(11), 0n)).toThrow();

    // The rejected attempt left the tally untouched.
    expect(ledger(afterFirst.currentQueryContext.state).yesVotes).toEqual(1n);
  });

  it("CLOSED: nullifiers are unlinkable to the voter's identity hash", () => {
    const sk = secretKey(11);
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");
    const after = voteAs(afterCreate.context, sk, 0n);

    const state = ledger(after.currentQueryContext.state);
    const [nullifier] = [...state.spentNullifiers];

    // The recorded nullifier is neither the secret key nor the identity hash derived
    // from it, so the public set cannot be joined against either.
    expect(hex(nullifier)).not.toEqual(hex(sk));
    expect(hex(nullifier)).not.toEqual(
      hex(pureCircuits.derivedPublicKey(sk, ZERO_SEQUENCE)),
    );
  });

  it("GAP (open): any secret key may vote — there is still no eligibility check", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");

    // A key entirely unrelated to the poll creator, never enrolled in any allowlist.
    const strangerContext: CircuitContext<PrivatePollingPrivateState> = {
      ...afterCreate.context,
      currentPrivateState: createPrivatePollingPrivateState(secretKey(9)),
    };

    const after = contract.impureCircuits.castVote(strangerContext, 1n);
    expect(ledger(after.context.currentQueryContext.state).noVotes).toEqual(1n);
  });

  it("GAP (open): the tally reveals the exact distribution of every individual choice", () => {
    const context = deploy(secretKey(1));
    const afterCreate = contract.impureCircuits.createPoll(context, "Q");
    const afterVote = contract.impureCircuits.castVote(afterCreate.context, 0n);

    // With a single ballot cast, the public counters identify that voter's choice
    // exactly. `castVote` discloses `choice`, so this is visible in the transaction
    // itself as well — not merely inferred from a small tally.
    const state = ledger(afterVote.context.currentQueryContext.state);
    expect(state.yesVotes).toEqual(1n);
    expect(state.noVotes).toEqual(0n);
    expect(state.abstainVotes).toEqual(0n);
  });
});
