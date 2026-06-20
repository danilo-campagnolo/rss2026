# Agent Context

## Project

RSS Feed Engine is a local-first, single-user RSS and Atom reader. The app uses Next.js App Router, TypeScript, Prisma, SQLite, Tailwind CSS, `rss-parser`, `sanitize-html`, and `lucide-react`.

## Commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

For normal local development after dependencies are installed, `npm run dev` is enough: it creates `.env` if missing, ensures the SQLite file exists, applies migrations, and starts Next.js.

## Architecture

- `app/components/ReaderApp.tsx`: client-side reader UI and workflow state.
- `app/api/**`: JSON API routes for feeds, entries, and refresh operations.
- `lib/feeds.ts`: feed normalization, fetching, parsing, sanitization, dedupe, import, and refresh.
- `lib/prisma.ts`: shared Prisma client.
- `prisma/schema.prisma`: SQLite schema.

## Implementation Rules

- Keep v1 single-user unless the issue explicitly adds accounts/auth.
- Keep v1 local-first with SQLite unless the issue explicitly targets deployment.
- Sanitize feed HTML before rendering it.
- Do not introduce scheduled workers, OPML, folders, or tags unless the issue asks for that scope.
- Preserve read/starred state when refreshing an existing entry.
- Dedupe entries by feed plus GUID, with URL as the fallback GUID.
- Do not commit local `.env` files or SQLite databases.

## Testing

- Add unit tests for feed normalization and parsing behavior.
- Add API or UI tests when changing request/response behavior or user workflows.
- Run `npm run lint`, `npm test`, and `npm run build` before handoff when dependencies are installed.
