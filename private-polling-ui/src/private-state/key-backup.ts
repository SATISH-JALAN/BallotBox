/**
 * Key backup and restore.
 *
 * A poll key lives in this browser's storage. Clearing site data, switching browsers, or
 * moving to another machine loses it — and with it the right to vote (voter), to run the
 * poll (organizer), or to decrypt (trustee). The backup file is the only recovery path.
 *
 * The same format is written by the CLI's `deploy-direct`, so an organizer who deployed
 * from the terminal can manage the poll from the browser by restoring that file.
 */

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { bytesToHex, isHex32, hexToBytes } from './hex';
import { readStoredSecretKey, writeStoredSecretKey } from './local-storage-private-state-provider';

export const KEY_BACKUP_FORMAT = 'ballotbox-key-backup/v1';

export type KeyBackup = {
  readonly format: typeof KEY_BACKUP_FORMAT;
  readonly networkId: string;
  readonly contractAddress: ContractAddress;
  readonly secretKey: string;
  readonly createdAt?: string;
  readonly warning?: string;
};

export const createKeyBackup = (networkId: string, contractAddress: ContractAddress): KeyBackup | null => {
  const secretKey = readStoredSecretKey(networkId, contractAddress);
  if (secretKey === null) return null;
  return {
    format: KEY_BACKUP_FORMAT,
    networkId,
    contractAddress,
    secretKey: bytesToHex(secretKey),
    createdAt: new Date().toISOString(),
    warning: 'Anyone holding this key can vote, organize, or decrypt as you on this poll. Keep it private.',
  };
};

/** Validates and parses a backup file's text. Throws with a message fit to show the user. */
export const parseKeyBackup = (text: string, expectedNetworkId: string): KeyBackup => {
  let parsed: Partial<KeyBackup>;
  try {
    parsed = JSON.parse(text) as Partial<KeyBackup>;
  } catch {
    throw new Error('That file is not a valid key backup (it is not JSON).');
  }
  if (parsed.format !== KEY_BACKUP_FORMAT) throw new Error('That file is not a BallotBox key backup.');
  if (typeof parsed.secretKey !== 'string' || !isHex32(parsed.secretKey)) {
    throw new Error('The backup is missing a valid 32-byte secret key.');
  }
  if (typeof parsed.contractAddress !== 'string' || parsed.contractAddress.length === 0) {
    throw new Error('The backup does not say which poll it belongs to.');
  }
  if (parsed.networkId !== expectedNetworkId) {
    throw new Error(`This backup is for "${String(parsed.networkId)}", but the app is on "${expectedNetworkId}".`);
  }
  return parsed as KeyBackup;
};

export const restoreKeyBackup = (backup: KeyBackup): boolean =>
  writeStoredSecretKey(backup.networkId, backup.contractAddress, hexToBytes(backup.secretKey));

/**
 * Offers the backup as a file download. Browsers only honour this inside a user gesture,
 * so call it from a click handler.
 */
export const downloadKeyBackup = (backup: KeyBackup): void => {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ballotbox-key-${backup.contractAddress.slice(0, 12)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
