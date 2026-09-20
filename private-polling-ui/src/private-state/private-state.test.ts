import { beforeEach, describe, expect, it } from 'vitest';
import { createPrivatePollingPrivateState } from '@midnight-ntwrk/private-polling-contract';
import { privatePollingPrivateStateKey } from '../../../api/src/index';
import { localStoragePrivateStateProvider, privateStateStorageKey } from './local-storage-private-state-provider';
import { KEY_BACKUP_FORMAT, createKeyBackup, parseKeyBackup, restoreKeyBackup } from './key-backup';
import { bytesToHex, hexToBytes } from './hex';

/** Minimal in-memory stand-in for window.localStorage. */
const installStorage = (): Map<string, string> => {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  return store;
};

const ADDRESS = 'ab'.repeat(34);
const SECRET = new Uint8Array(32).fill(7);

describe('localStoragePrivateStateProvider', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installStorage();
  });

  it('keeps the secret key across a page reload (a fresh provider instance)', async () => {
    const first = localStoragePrivateStateProvider('preprod');
    first.setContractAddress(ADDRESS);
    await first.set(privatePollingPrivateStateKey, createPrivatePollingPrivateState(SECRET));

    const afterReload = localStoragePrivateStateProvider('preprod');
    afterReload.setContractAddress(ADDRESS);
    const restored = await afterReload.get(privatePollingPrivateStateKey);
    expect(restored && bytesToHex(restored.secretKey)).toEqual(bytesToHex(SECRET));
  });

  it('never writes a staged ballot to storage', async () => {
    const provider = localStoragePrivateStateProvider('preprod');
    provider.setContractAddress(ADDRESS);
    await provider.set(privatePollingPrivateStateKey, createPrivatePollingPrivateState(SECRET, 1));

    const raw = store.get(privateStateStorageKey('preprod', ADDRESS)) ?? '';
    expect(raw).not.toContain('pendingChoice');
    // ...but the current page still sees it, because castVote needs it for the witness.
    expect((await provider.get(privatePollingPrivateStateKey))?.pendingChoice).toEqual(1);
  });

  it('scopes keys by network and contract', async () => {
    const preprod = localStoragePrivateStateProvider('preprod');
    preprod.setContractAddress(ADDRESS);
    await preprod.set(privatePollingPrivateStateKey, createPrivatePollingPrivateState(SECRET));

    const preview = localStoragePrivateStateProvider('preview');
    preview.setContractAddress(ADDRESS);
    expect(await preview.get(privatePollingPrivateStateKey)).toBeNull();

    preprod.setContractAddress('cd'.repeat(34));
    expect(await preprod.get(privatePollingPrivateStateKey)).toBeNull();
  });

  it('survives storage that throws (private browsing)', async () => {
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('denied');
        },
        removeItem: () => undefined,
      },
    };
    const provider = localStoragePrivateStateProvider('preprod');
    provider.setContractAddress(ADDRESS);
    await provider.set(privatePollingPrivateStateKey, createPrivatePollingPrivateState(SECRET));
    expect((await provider.get(privatePollingPrivateStateKey))?.secretKey).toEqual(SECRET);
  });
});

describe('key backup', () => {
  beforeEach(() => {
    installStorage();
  });

  it('round-trips a key through backup and restore', async () => {
    const provider = localStoragePrivateStateProvider('preprod');
    provider.setContractAddress(ADDRESS);
    await provider.set(privatePollingPrivateStateKey, createPrivatePollingPrivateState(SECRET));

    const backup = createKeyBackup('preprod', ADDRESS);
    expect(backup?.format).toEqual(KEY_BACKUP_FORMAT);

    installStorage(); // a different browser
    const parsed = parseKeyBackup(JSON.stringify(backup), 'preprod');
    expect(restoreKeyBackup(parsed)).toBe(true);

    const other = localStoragePrivateStateProvider('preprod');
    other.setContractAddress(ADDRESS);
    expect(bytesToHex((await other.get(privatePollingPrivateStateKey))!.secretKey)).toEqual(bytesToHex(SECRET));
  });

  it('rejects files that are not a valid backup for this network', () => {
    expect(() => parseKeyBackup('not json', 'preprod')).toThrow(/not JSON/);
    expect(() => parseKeyBackup('{}', 'preprod')).toThrow(/not a BallotBox key backup/);
    const good = {
      format: KEY_BACKUP_FORMAT,
      networkId: 'preview',
      contractAddress: ADDRESS,
      secretKey: 'aa'.repeat(32),
    };
    expect(() => parseKeyBackup(JSON.stringify(good), 'preprod')).toThrow(/preview/);
    expect(() =>
      parseKeyBackup(JSON.stringify({ ...good, networkId: 'preprod', secretKey: 'xyz' }), 'preprod'),
    ).toThrow(/secret key/);
  });

  it('accepts the file written by the CLI deploy script', () => {
    const cliFile = {
      format: 'ballotbox-key-backup/v1',
      networkId: 'preprod',
      contractAddress: ADDRESS,
      secretKey: bytesToHex(SECRET),
      warning: 'Organizer/admin key.',
    };
    expect(hexToBytes(parseKeyBackup(JSON.stringify(cliFile), 'preprod').secretKey)).toEqual(SECRET);
  });
});
