# Contributing

Thanks for helping improve RSS Feed Engine.

## Workflow

1. Check existing issues before starting substantial work.
2. Open an issue for larger changes so the behavior and scope can be discussed.
3. Keep pull requests focused on one feature, fix, or refactor.
4. Include tests for feed parsing, API behavior, or UI logic when behavior changes.
5. Update documentation when commands, setup, APIs, or user-facing behavior change.

## Local Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

## Quality Checks

Run these before opening a pull request:

```bash
npm run lint
npm test
npm run build
```

## Code Style

- Use TypeScript and keep strict typing enabled.
- Prefer small, direct modules over broad abstractions.
- Keep feed parsing and persistence logic in `lib/feeds.ts` unless it grows enough to split by responsibility.
- Keep UI controls accessible with semantic buttons, inputs, labels, and useful titles for icon-only buttons.
- Sanitize any feed-provided HTML before rendering.
- Do not commit local databases or environment files.

## Commit Guidance

Use clear, imperative commit messages:

```text
Add feed import route
Fix duplicate entry handling
Document local setup
```
