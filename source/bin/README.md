# Scripts
utility scripts for building and launching QNABot

## Sanitize Allowlist Sync

`sync-sanitize-allowlist.js` regenerates `source/lambda/es-proxy-layer/lib/sanitizeOutput.js` and `source/website/js/components/designer/sanitizeOutput.js` (Fulfillment Lambda and Content Designer) from the single canonical allowlist config at `sanitizeAllowlist.js` (same directory), so the two copies can't silently drift apart. It runs **automatically** on every build — `make build`, `npm run up`/`update`, `build-s3-dist.sh`, `npm run build:website`, `npm run analyze`, and `make` run directly inside `source/lambda/es-proxy-layer/` — no manual step needed.

To change the allowlist:
1. Edit `source/bin/sanitizeAllowlist.js`
2. Run any build — both `sanitizeOutput.js` files regenerate automatically
3. Commit only `source/bin/sanitizeAllowlist.js` — the two `sanitizeOutput.js` files are gitignored

To preview the regenerated output without a full build: `node source/bin/sync-sanitize-allowlist.js`

Do not edit the two `sanitizeOutput.js` files directly — they're overwritten on the next build. If `source/lambda/es-proxy-layer/test/sanitizeOutput.test.js` or `source/website/__tests__/components/designer/sanitizeOutput.test.js` fails, that means the generated output has drifted from the canonical file — re-run the sync.
