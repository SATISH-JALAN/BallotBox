/**
 * Browser private state that survives a page reload.
 *
 * The previous in-memory provider generated a fresh secret key on every load. For this
 * contract that is not a cosmetic bug: the key *is* the voter's enrolment credential, the
 * organizer's authority, and a trustee's decryption share. Losing it on refresh meant an
 * enrolled voter could no longer vote, and a trustee could seal a poll permanently.
 *
 * What is persisted, and what deliberately is not:
 *
 *   - `secretKey` is written to localStorage, scoped per network and contract address.
 *   - `pendingChoice` (a ballot staged for the next `castVote`) is kept in memory only.
 *     A secret ballot has no business sitting at rest in the browser.
 *
 * localStorage is readable by any script on this origin, so the UI also offers an explicit
 * key backup and restore — see `key-backup.ts`.
 */

import type { ContractAddress, SigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type ExportPrivateStatesOptions,
  type ExportSigningKeysOptions,
  type ImportPrivateStatesOptions,
  type ImportPrivateStatesResult,
  type ImportSigningKeysOptions,
  type ImportSigningKeysResult,
  type PrivateStateExport,
  type PrivateStateProvider,
  type SigningKeyExport,
} from '@midnight-ntwrk/midnight-js-types';
import {
  createPrivatePollingPrivateState,
  type PrivatePollingPrivateState,
} from '@midnight-ntwrk/private-polling-contract';
import { privatePollingPrivateStateKey, type PrivateStateId } from '../../../api/src/index';
import { bytesToHex, hexToBytes } from './hex';

const STORAGE_PREFIX = 'ballotbox:v1';

type StoredPrivateState = { readonly secretKey: string };

/** Storage keys are namespaced by network so a Preview key never leaks into Preprod. */
export const privateStateStorageKey = (networkId: string, address: ContractAddress): string =>
  `${STORAGE_PREFIX}:${networkId}:private-state:${address}`;

const signingKeyStorageKey = (networkId: string, address: ContractAddress): string =>
  `${STORAGE_PREFIX}:${networkId}:signing-key:${address}`;

/** Access to storage can throw (private browsing, disabled site data); never let it crash the app. */
const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // nothing to clean up if storage is unavailable
    }
  },
};

export const readStoredSecretKey = (networkId: string, address: ContractAddress): Uint8Array | null => {
  const raw = safeStorage.get(privateStateStorageKey(networkId, address));
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPrivateState>;
    return typeof parsed.secretKey === 'string' ? hexToBytes(parsed.secretKey) : null;
  } catch {
    return null;
  }
};

export const writeStoredSecretKey = (networkId: string, address: ContractAddress, secretKey: Uint8Array): boolean =>
  safeStorage.set(
    privateStateStorageKey(networkId, address),
    JSON.stringify({ secretKey: bytesToHex(secretKey) } satisfies StoredPrivateState),
  );

export const localStoragePrivateStateProvider = (
  networkId: string,
): PrivateStateProvider<PrivateStateId, PrivatePollingPrivateState> => {
  // Full state, including any staged ballot, for the lifetime of the page.
  const memory = new Map<ContractAddress, PrivatePollingPrivateState>();
  let contractAddress: ContractAddress | null = null;

  const requireAddress = (): ContractAddress => {
    if (contractAddress === null) {
      throw new Error('Contract address not set. Call setContractAddress() before accessing private state.');
    }
    return contractAddress;
  };

  const assertKnownId = (id: PrivateStateId): void => {
    if (id !== privatePollingPrivateStateKey) {
      throw new Error(`Unknown private state id '${String(id)}'`);
    }
  };

  const load = (address: ContractAddress): PrivatePollingPrivateState | null => {
    const cached = memory.get(address);
    if (cached) return cached;
    const secretKey = readStoredSecretKey(networkId, address);
    if (secretKey === null) return null;
    const state = createPrivatePollingPrivateState(secretKey);
    memory.set(address, state);
    return state;
  };

  return {
    setContractAddress(address: ContractAddress): void {
      contractAddress = address;
    },

    set(id: PrivateStateId, state: PrivatePollingPrivateState): Promise<void> {
      assertKnownId(id);
      const address = requireAddress();
      memory.set(address, state);
      writeStoredSecretKey(networkId, address, state.secretKey);
      return Promise.resolve();
    },

    get(id: PrivateStateId): Promise<PrivatePollingPrivateState | null> {
      assertKnownId(id);
      return Promise.resolve(load(requireAddress()));
    },

    remove(id: PrivateStateId): Promise<void> {
      assertKnownId(id);
      const address = requireAddress();
      memory.delete(address);
      safeStorage.remove(privateStateStorageKey(networkId, address));
      return Promise.resolve();
    },

    clear(): Promise<void> {
      const address = requireAddress();
      memory.delete(address);
      safeStorage.remove(privateStateStorageKey(networkId, address));
      return Promise.resolve();
    },

    setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      safeStorage.set(signingKeyStorageKey(networkId, address), signingKey);
      return Promise.resolve();
    },

    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return Promise.resolve(safeStorage.get(signingKeyStorageKey(networkId, address)));
    },

    removeSigningKey(address: ContractAddress): Promise<void> {
      safeStorage.remove(signingKeyStorageKey(networkId, address));
      return Promise.resolve();
    },

    clearSigningKeys(): Promise<void> {
      // Signing keys are scoped per contract; there is no global list to clear safely.
      return Promise.resolve();
    },

    exportPrivateStates(options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      void options;
      const address = requireAddress();
      const state = load(address);
      return Promise.resolve({
        format: 'midnight-private-state-export',
        encryptedPayload: JSON.stringify({
          contractAddress: address,
          states: state ? { [privatePollingPrivateStateKey]: bytesToHex(state.secretKey) } : {},
        }),
        salt: 'ballotbox-local-storage',
      });
    },

    importPrivateStates(
      exportData: PrivateStateExport,
      options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      const address = requireAddress();
      const payload = JSON.parse(exportData.encryptedPayload) as { states?: Record<string, string> };
      const secretHex = payload.states?.[privatePollingPrivateStateKey];
      if (secretHex === undefined) return Promise.resolve({ imported: 0, skipped: 0, overwritten: 0 });

      const existing = load(address);
      const strategy = options?.conflictStrategy ?? 'error';
      if (existing && strategy === 'skip') return Promise.resolve({ imported: 0, skipped: 1, overwritten: 0 });
      if (existing && strategy === 'error') {
        return Promise.reject(new Error(`Private state conflict for '${privatePollingPrivateStateKey}'`));
      }
      const state = createPrivatePollingPrivateState(hexToBytes(secretHex));
      memory.set(address, state);
      writeStoredSecretKey(networkId, address, state.secretKey);
      return Promise.resolve({ imported: existing ? 0 : 1, skipped: 0, overwritten: existing ? 1 : 0 });
    },

    exportSigningKeys(options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      void options;
      return Promise.resolve({
        format: 'midnight-signing-key-export',
        encryptedPayload: JSON.stringify({ keys: {} }),
        salt: 'ballotbox-local-storage',
      });
    },

    importSigningKeys(
      exportData: SigningKeyExport,
      options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      void options;
      const payload = JSON.parse(exportData.encryptedPayload) as { keys?: Record<ContractAddress, SigningKey> };
      const entries = Object.entries(payload.keys ?? {});
      for (const [address, key] of entries) safeStorage.set(signingKeyStorageKey(networkId, address), key);
      return Promise.resolve({ imported: entries.length, skipped: 0, overwritten: 0 });
    },
  };
};
