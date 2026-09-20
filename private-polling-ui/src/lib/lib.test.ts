import { describe, expect, it } from 'vitest';
import { parseCommitments } from './commitments';
import { friendlyError } from './friendly-errors';

describe('parseCommitments', () => {
  const a = 'a'.repeat(64);
  const b = 'B'.repeat(64);

  it('splits on newlines, commas and spaces, and accepts a 0x prefix', () => {
    const { valid, invalid } = parseCommitments(`${a}\n0x${b}, ${'c'.repeat(64)}`);
    expect(valid).toHaveLength(3);
    expect(invalid).toEqual([]);
  });

  it('drops duplicates regardless of case or prefix, so one voter never takes two slots', () => {
    const { valid } = parseCommitments(`${b}\n0x${b.toLowerCase()}`);
    expect(valid).toHaveLength(1);
  });

  it('reports malformed entries instead of silently skipping them', () => {
    const { valid, invalid } = parseCommitments(`${a}\nnot-hex\n${'a'.repeat(63)}`);
    expect(valid).toHaveLength(1);
    expect(invalid).toEqual(['not-hex', 'a'.repeat(63)]);
  });
});

describe('friendlyError', () => {
  it('explains a missing proof server and keeps the raw cause', () => {
    const message = friendlyError(new Error('TypeError: Failed to fetch'));
    expect(message).toMatch(/proof server/);
    expect(message).toMatch(/Failed to fetch/);
  });

  it('maps contract assertions to plain language', () => {
    expect(friendlyError(new Error('failed assert: This commitment is already enrolled'))).toMatch(
      /already enrolled in this poll/,
    );
    expect(friendlyError(new Error('failed assert: Only the contract admin can start a poll'))).toMatch(
      /deployed this contract/,
    );
  });

  it('passes unknown errors through unchanged', () => {
    expect(friendlyError(new Error('something novel'))).toEqual('something novel');
    expect(friendlyError('plain string')).toEqual('plain string');
  });
});
