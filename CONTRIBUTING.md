# Contributing to BallotBox

Thanks for helping! Bug reports, feedback, docs fixes and code are all welcome.

## Ways to help

- **Test on Preprod** and send [feedback](https://github.com/SATISH-JALAN/private-pooling/issues/new?template=user-feedback.yml). This is the most useful thing right now.
- **Report bugs** with the bug-report template. For vulnerabilities, see [SECURITY.md](./SECURITY.md).
- **Improve docs.** If something in the [user guide](./docs/USER_GUIDE.md) confused you, it's a bug.
- **Send code.** Please open an issue first for anything beyond a small fix.

## Development setup

```bash
npm ci --legacy-peer-deps
npm run compact      # compile the contract (uses WSL on Windows)
npm run build
npm test
npm run dev          # web app on http://localhost:5173
```

See the [README quickstart](./README.md#quickstart--run-it-locally) for prerequisites and
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how the pieces fit together.

## Pull requests

1. Branch from `main`.
2. Keep each PR to one concern, and each commit to one logical change, using
   [Conventional Commits](https://www.conventionalcommits.org/) (`feat(ui): …`, `fix(contract): …`).
3. Run `npm run ci` locally. CI runs the same checks and must pass.
4. **Contract changes need tests.** Add a `CLOSED:` test when you close a privacy gap and a
   `GAP (open):` test when you document one.
5. Update docs in the same PR (README, user guide, PRIVACY.md, CHANGELOG.md).
6. Never commit seeds, `.env` files, or key backups.

By contributing you agree that your contributions are licensed under [Apache 2.0](./LICENSE).
