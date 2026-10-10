# Development Guide

## Local Setup

Use Node.js 22+. Run `npm ci`, `npm run build`, then `npm run dev`.
The server binds to `127.0.0.1:4173`. Set `PORT` to choose another port.
It does not automatically rebuild or load environment files.

For optional settings, create an ignored `.env.local` from `.env.example`, then run:

```sh
node --env-file=.env.local scripts/dev.mjs
```

Never commit credentials, local records, or production environment downloads.

## Vercel Deployment

1. Import this repository into Vercel, or run `npx vercel`.
2. Connect a **private Vercel Blob store** to the intended environments.
3. Configure `APP_PASSWORD` as a server-side secret. The username is `owner`.
4. Deploy with `npx vercel --prod`.

`vercel.json` runs `npm run build:vercel` and routes the app through `api/index.mjs`. The handler refuses access if the password is absent. Store integration must supply `BLOB_READ_WRITE_TOKEN` or supported `BLOB_STORE_ID`/Vercel identity settings.

Private Blob reads request uncompressed content and bypass cache. This preserves the strong ETag needed for conditional writes. Weak or missing identifiers fail closed. Version conflicts retry against fresh state rather than overwriting another request.

| Variable | Purpose |
| --- | --- |
| `APP_PASSWORD` | Required hosted owner password |
| `BLOB_READ_WRITE_TOKEN` | Private Blob credential from store integration |
| `BLOB_STORE_ID` | Alternative identifier with supported Vercel identity authentication |
| `OPENAI_API_KEY` | Optional server-side AI credential |
| `OPENAI_MODEL` | Optional model identifier; both AI settings are required |
| `PORT` | Optional local server port |

`.openai/hosting.json` supports the original Sites build. Its project identifier is hosting metadata, not a credential; it grants no access and is not used on Vercel.

## Dataset Format

Upload a JSON array or JSONL, with 1-500 tasks. Required fields are `source`, `a`, and `b`. Optional expert-reviewed `gold` accepts `a`, `b`, `tie`, or `neither`.

```json
[
  {
    "source": "Original text to translate",
    "a": "First candidate translation",
    "b": "Second candidate translation"
  }
]
```

This is a schema example, not a language benchmark. The budget must cover all tasks, including controls. Domain amounts use integer hundredths; the UI converts decimal inputs.

## API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/state` | GET | Workspace summary |
| `/api/task?campaign=<id>` | GET | Next task without its gold answer |
| `/api/campaigns` | POST | Create a draft campaign |
| `/api/fund` | POST | Activate its simulated pool |
| `/api/submit` | POST | Submit a choice and rationale |
| `/api/review` | POST | Accept or reject work |
| `/api/appeal` | POST | Request one appeal |
| `/api/pay` | POST | Claim an accepted test reward |
| `/api/close` | POST | Close after resolving liabilities |
| `/api/export?campaign=<id>&format=csv` | GET | Export accepted production data; `jsonl` also supported |

POST requests require JSON. Hosted requests require owner authentication. The UI role switch does not restrict API permissions.

Each submission reserves its reward. Rejection releases the reserve; an appeal reserves it again. Claims consume the reservation once. Closing is blocked by unresolved liabilities or unexercised appeal rights. Production use needs a configurable appeal deadline.

The optional AI adapter sends task content and the rationale to the provider. Failures fall back to expert review. AI never approves payments. Correct controls can pass their reference check automatically.

## Source Map

| Path | Responsibility |
| --- | --- |
| `src/` | Browser UI and styling |
| `worker/domain.js` | Campaign and ledger rules |
| `worker/index.js` | API, AI adapter, state mutations |
| `api/index.mjs` | Vercel authentication and request bridge |
| `server/vercel-storage.mjs` | Private Blob adapter |
| `scripts/` | Build, local server, validation |
| `tests/` | Domain and storage regression tests |

## Verification

```sh
npm test
npm run build
npm run validate
npm run build:vercel
```

Also test funding and contributor task retrieval on a test deployment. Unit tests cannot reproduce every hosted storage or authentication behavior.
