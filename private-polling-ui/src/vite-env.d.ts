/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Midnight network identifier: "preprod" | "preview" */
  readonly VITE_NETWORK_ID: string;
  /** Pino logger level */
  readonly VITE_LOGGING_LEVEL: string;
  /** Featured poll contract address shown on the landing page */
  readonly VITE_CONTRACT_ADDRESS?: string;
  /** Product X (Twitter) profile URL */
  readonly VITE_X_URL?: string;
  /** Repository URL */
  readonly VITE_GITHUB_URL?: string;
  /** Structured feedback form URL (e.g. a Google Form) */
  readonly VITE_FEEDBACK_URL?: string;
  /** User guide URL */
  readonly VITE_USER_GUIDE_URL?: string;
  /** Block explorer transaction URL template containing `{tx}` */
  readonly VITE_EXPLORER_TX_URL?: string;
  /** Indexer GraphQL endpoints for the wallet-free poll preview (default: public Midnight indexer) */
  readonly VITE_INDEXER_URL?: string;
  readonly VITE_INDEXER_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
