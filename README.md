# SkillSwap

**Neighbors trade skills, no money.** A community noticeboard where you pin what you can teach and what you want to learn, find reciprocal matches, and swap. No payments, no ratings, no algorithm.

Live: https://skillswap.emtiazzahid.workers.dev

![SkillSwap landing](design/renders/01-landing-desktop.png)

## How it works

1. **Pin what you know.** Post an _offer_ for anything you can teach and a _want_ for anything you want to learn.
2. **Find a match.** The board shows who wants what you offer and who offers what you want. Reciprocal pairs float to the top.
3. **Swap and say thanks.** Accept a request, contact details unlock for both sides, meet in public or online, leave a one-line thank-you note.

Any group can start its own board: a neighborhood, a campus hall, a Discord server.

## Stack

- SvelteKit 2 + Svelte 5, TypeScript end to end
- Cloudflare Workers, D1 (SQLite), KV, Cron Triggers — fits in the free tier
- Drizzle ORM, Arctic (GitHub + Google OAuth)
- Vitest running inside `workerd` for unit tests, Playwright for end-to-end

## Design

The UI is a "community noticeboard": pinned paper cards, tape, cork, hand-set type. The static mockups in [`design/mockups`](design/mockups) and the shared stylesheet [`design/board.css`](design/board.css) are the source of truth; the app imports the same CSS. Render them with:

```bash
pnpm mockups:render
```

## Develop

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

- `pnpm test` runs unit tests inside the Workers runtime with a real local D1.
- `pnpm test:e2e` builds, migrates a local D1, starts `wrangler dev` and runs Playwright.
- `pnpm check` and `pnpm lint` for types and style.

## Self-host

1. Create a D1 database and KV namespace on your Cloudflare account and put their ids in `wrangler.jsonc`.
2. Create a GitHub OAuth app and/or Google OAuth client with callback `https://<your-domain>/auth/callback/<provider>`.
3. `wrangler secret put` for `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CONTACT_KEY`.
4. `pnpm db:migrate:remote && pnpm deploy`.

## License

MIT. Non-commercial hobby project by [Emtiaz Zahid](https://github.com/emtiazzahid).
