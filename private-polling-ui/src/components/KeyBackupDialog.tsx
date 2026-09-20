import React, { useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { NETWORK_ID, pollShareUrl } from '../config/product';
import { createKeyBackup, downloadKeyBackup, parseKeyBackup, restoreKeyBackup } from '../private-state/key-backup';
import { tokens } from '../config/theme';

export interface KeyBackupDialogProps {
  readonly open: boolean;
  readonly contractAddress: string;
  readonly onClose: () => void;
}

/**
 * Back up or restore the secret key for one poll.
 *
 * Restoring replaces the key in this browser and reloads the poll, because the live state
 * stream was derived from the old key and would otherwise keep showing its roles.
 */
export const KeyBackupDialog: React.FC<KeyBackupDialogProps> = ({ open, contractAddress, onClose }) => {
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onDownload = () => {
    const backup = createKeyBackup(NETWORK_ID, contractAddress);
    if (!backup) {
      setMessage({ severity: 'error', text: 'No key is stored for this poll in this browser yet.' });
      return;
    }
    downloadKeyBackup(backup);
    setMessage({ severity: 'success', text: 'Backup downloaded. Store it somewhere private.' });
  };

  const onRestoreFile = async (file: File) => {
    try {
      const backup = parseKeyBackup(await file.text(), NETWORK_ID);
      if (backup.contractAddress !== contractAddress) {
        throw new Error('That backup belongs to a different poll.');
      }
      if (!window.confirm('Replace the key stored in this browser for this poll? This cannot be undone.')) return;
      if (!restoreKeyBackup(backup)) throw new Error('This browser blocked saving the key (storage unavailable).');
      window.location.assign(pollShareUrl(contractAddress));
    } catch (e) {
      setMessage({ severity: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Your key for this poll</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: tokens.inkSecondary, mb: 2, lineHeight: 1.6 }}>
          This browser holds a secret key for this poll. It is what proves you are enrolled, lets an organizer run the
          poll, and lets a trustee decrypt. It never leaves your device — so if you clear site data or switch browsers
          without a backup, that role is gone for good.
        </Typography>
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Anyone with the backup file can act as you on this poll. Do not share it or commit it.
        </Alert>
        {message && (
          <Alert severity={message.severity} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={onDownload}>
            Download backup
          </Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInput.current?.click()}>
            Restore from file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void onRestoreFile(file);
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
