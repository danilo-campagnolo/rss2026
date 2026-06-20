# RSS Feed Engine

A local-first, single-user RSS and Atom reader built with Next.js, Prisma, and SQLite.

The first version focuses on the core reader loop: import feeds, fetch entries, browse updates, read articles, and keep read/starred state locally.

## Features

- Import RSS and Atom feed URLs.
- Fetch, normalize, sanitize, and deduplicate feed entries.
- Browse all feeds or a single feed.
- Search entries and filter by all, unread, read, or starred.
- Mark entries read/unread and starred/unstarred.
- Refresh one feed or all feeds.
- Delete a feed and its entries.
- Local SQLite storage with Prisma.
- Responsive reader UI for desktop and mobile.

## Getting Started

Requirements:

- Node.js 20 or newer.
- npm.

Setup:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` creates `.env` from `.env.example` when needed, creates the local SQLite database file, applies migrations, and starts the Next.js dev server.

## Development Commands

```bash
npm run dev        # prepare local SQLite, apply migrations, and start the dev server
npm run build      # generate Prisma client and build for production
npm run lint       # run ESLint
npm test           # run unit tests
npm run db:migrate # apply local Prisma migrations
npm run db:studio  # inspect the local database
```

## Architecture

- `app/` contains the Next.js App Router UI and API routes.
- `app/components/ReaderApp.tsx` contains the interactive reader shell.
- `lib/feeds.ts` contains feed URL normalization, parsing, sanitization, refresh, and import logic.
- `lib/prisma.ts` exposes a shared Prisma client.
- `prisma/schema.prisma` defines the local SQLite data model.

V1 is intentionally single-user and local-first. Authentication, OPML import/export, folders, scheduled workers, and cloud deployment are good follow-up milestones.

## Roadmap

- OPML import and export.
- Folder and tag organization.
- Scheduled background refresh.
- Keyboard shortcuts.
- Reader display settings.
- Full-text archive mode.
- Multi-user and cloud deployment support.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## License

MIT. See [LICENSE](LICENSE).
