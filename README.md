# rekordo-frontend

Web app for **Rekordo** — the desktop surface: the sidebar library (`1f`) and the
item detail with editable fields beside the sleeve (`1g`).

The app is **local-first**. The collection lives in IndexedDB and is readable and editable
with no account; signing in only starts syncing it to
[`rekordo-backend`](https://github.com/Janne6565/rekordo-backend). See that
repo's `docs/PLAN.md` for the architecture.

## Stack

React 19 · Vite · Bun · TanStack Router + Query · Redux Toolkit · Tailwind v4 ·
lucide-react · typed react-i18next · Orval · Vitest · Biome

## Development

```bash
bun install
bun dev            # :5173, proxies /api to localhost:8080
```

```bash
bun run build      # typecheck + production build
bun test           # Vitest
bun run lint       # Biome
bun run gen:api    # regenerate the Orval client (backend must be running)
```

## Design tokens

`src/styles.css` holds the palette and type scale taken from the Claude Design deck.
The mobile app mirrors these — change them in both, or the two apps stop reading as one
product.

## The shared package

The domain, the merge, the write path and the sync engine live in
[`rekordo-shared`](https://github.com/Janne6565/rekordo-shared) and are
installed from GitHub Packages, which authenticates reads even for a public package. Before
`bun install`:

```
export NODE_AUTH_TOKEN=$(gh auth token)   # needs the read:packages scope
```

CI uses `secrets.GITHUB_TOKEN`; the Docker build takes the same token as a build secret.
