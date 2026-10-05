# Train to Earn

A private, single-owner MVP for reviewing Russian-to-Kazakh translations. The owner can switch between contributor and customer views to exercise the entire workflow. The role switch is not multi-user authorization.

## Run

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm run dev
```

Open http://127.0.0.1:4173. Set PORT to choose another port. Local records persist in `.local/state.json` (ignored by Git). Rebuild and restart after changing source.

```sh
npm test
npm run validate
```

## Demo

1. Select the customer view and fund the seeded campaign with test units.
2. Select the contributor view, open the campaign, compare translations, and explain your choice.
3. Select the customer view and review submissions, providing a reason for each decision.
4. Open rewards and claim accepted work. Repeated claims cannot pay the same submission twice.
5. Open campaign management and export accepted production feedback as JSONL or CSV. Controls are excluded.

New campaigns accept a JSON array or JSONL with `source`, `a`, `b`, and optional expert-reviewed `gold` (`a`, `b`, `tie`, or `neither`). A downloadable template is in the creation dialog. Every submission reserves its fixed reward, including controls. Rejection releases the reserve; one appeal reserves it again. A campaign cannot close with unresolved liabilities or unexercised appeal rights. A production release needs a configurable appeal deadline.

## Architecture

- Vanilla JS, Lucide icons, responsive CSS; esbuild bundles both browser and Worker modules.
- Cloudflare Worker API with R2 conditional writes to prevent lost updates and duplicate payouts. All state is a single JSON object: appropriate for this bounded pilot, not large-scale operation.
- Sites owner-private access is the hosted authentication boundary. Do not make this app public without implementing server-side roles and contributor identities.
- Local server implements the same storage contract using a serialized file adapter.
- Currency values are integer hundredths, never floating point ledger amounts.
- Gold answers stay server-side. The public task endpoint excludes them.

## Explicit limitations

**Payments are simulation only.** Test units are not USDC; no wallet, Solana transaction, or deployed escrow program exists. A real devnet release requires a built and tested Solana program, wallet signing, program address, token mint, and a funded deployment wallet. No fake transaction IDs are generated.

**AI is optional and disconnected by default.** Set `OPENAI_API_KEY` and `OPENAI_MODEL` in the server environment to use the OpenAI chat-completions adapter. For hosted Sites, configure secrets through the platform. Never put keys in source or client code. Model calls may incur provider charges. Inputs are sent to the provider only when both settings are present. Provider failure falls back to expert review, and AI never authorizes payment. The live provider path has not been tested without credentials.

The seeded translations and controls are demonstration material, not a linguist-certified dataset. Human review is required before interpreting results as evidence of linguistic quality. There is no model fine-tuning in this MVP, no Sybil resistance, no calibrated reputation score, and no independent contributor consensus.

## Source

`worker/domain.js` contains ledger and workflow rules; `worker/index.js` provides API and persistence; `src/client.js` contains the UI; `tests/domain.test.mjs` exercises payout and validation invariants. Build output is in `dist/`. Hosted and local records are separate.
