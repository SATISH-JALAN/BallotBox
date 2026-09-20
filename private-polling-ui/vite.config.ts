// This file is part of midnightntwrk/example-counter.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

const MANAGED_DIR = resolve(__dirname, '../contract/src/managed/private-polling');

/**
 * Serves the compiled circuit keys and ZKIR at /keys and /zkir during `vite dev`.
 *
 * The browser fetches them from the page origin to build proofs. Production copies them
 * into dist/ (scripts/copy-zk-assets.mjs); without this, every transaction attempted from
 * the dev server fails at proving time with an opaque fetch error.
 */
const serveZkAssets = (): Plugin => ({
  name: 'serve-zk-assets',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] ?? '';
      if (!/^\/(keys|zkir)\/[\w.-]+$/.test(url)) return next();
      const file = resolve(MANAGED_DIR, `.${url}`);
      if (!file.startsWith(MANAGED_DIR) || !existsSync(file)) return next();
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', statSync(file).size);
      createReadStream(file).pipe(res);
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: './.vite',
  server: { port: 5173 },
  build: {
    target: 'esnext',
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate chunk for WASM modules to avoid top-level await issues
          if (id.includes('onchain-runtime-v3')) return 'wasm';
        },
      },
      },
    commonjsOptions: {
      // Transform CommonJS to ESM more aggressively
      transformMixedEsModules: true,
      extensions: ['.js', '.cjs'],
      // Needed for Node.js modules
      ignoreDynamicRequires: true,
    },
  },
  plugins: [
    serveZkAssets(),
    react(),
    // Configure WASM plugin with more options
    wasm(),
    topLevelAwait({
      // Be more permissive with top-level await
      promiseExportName: '__tla',
      promiseImportName: (i) => `__tla_${i}`,
    }),
    // Custom resolver for handling problematic modules
    {
      name: 'wasm-module-resolver',
      resolveId(source, importer) {
        // Special handling for the problematic module
        if (
          source === '@midnight-ntwrk/onchain-runtime-v3' &&
          importer &&
          importer.includes('@midnight-ntwrk/compact-runtime')
        ) {
          // Force dynamic import for this case
          return {
            id: source,
            external: false,
            moduleSideEffects: true,
          };
        }
        return null;
      },
    },
  ],
  optimizeDeps: {
    rolldownOptions: {
      target: 'esnext',
      supported: { 'top-level-await': true },
      // Configure ESBuild to handle Node.js-style modules
      platform: 'browser',
      format: 'esm',
      loader: {
        '.wasm': 'binary',
      },
    },
    // Explicitly include these packages for pre-bundling, but force ESM
    include: ['@midnight-ntwrk/compact-runtime'],
    // Exclude WASM files and modules with top-level await from optimization
    exclude: [
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_bg.wasm',
      '@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm.js',
    ],
  },
  define: {},
  checks: {
    importIsUndefined: false,
    pluginTimings: false,
  },
  // Add specific import configuration for more control
  resolve: {
    // Ensure WASM files are loaded properly
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.wasm'],
    mainFields: ['browser', 'module', 'main'],
  },
});
