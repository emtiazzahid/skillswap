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
pnpm seed:local        # optional demo board "Mirpur Lane" with six neighbours
pnpm dev
```

Copy `.dev.vars.example` to `.dev.vars`. With `E2E_MOCK_OAUTH=1` the login page gets a "test account" button, so you can sign in as any seed person by id (`seed-rina`, `seed-tanvir`, ...) without real OAuth apps.

- `pnpm test` runs unit tests inside the Workers runtime with a real local D1.
- `pnpm test:e2e` builds, migrates a local D1, starts `wrangler dev` and runs Playwright.
- `pnpm check` and `pnpm lint` for types and style.
- `pnpm mockups:render` re-renders the design mockups, `pnpm assets:render` the OG image and PWA icons.

## Features

- Boards for any group; public or invite-only, with owner, moderators, bans and invite links.
- Offers and wants with categories, level, format and availability. Titles with money words are refused.
- First notice on a board waits for a moderator; after that you're trusted. Notices expire after 90 days, renew in one click.
- Matches page: reciprocal pairs (you teach them, they teach you) scored by category, title similarity and format, plus a "you could gift" list.
- Swap requests with a note and an optional offer in return. Accept unlocks one contact method each way, decline with a reason, cancel, mark done, leave a thank-you note that sticks to their profile.
- Flags: three from different people hide a notice until a moderator looks.
- In-app notifications, unread envelope count, daily cron for expiry reminders and cleanup.
- Installable PWA with an offline page; no analytics, no tracking.

## Environment

| Name                                        | Where                    | Purpose                                                      |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| `DB`                                        | `wrangler.jsonc` binding | D1 database                                                  |
| `SESSIONS`                                  | `wrangler.jsonc` binding | KV: sessions, OAuth state, rate limits, match cache          |
| `PUBLIC_ORIGIN`                             | `wrangler.jsonc` var     | Absolute origin used in OAuth callbacks and OG tags          |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | secret                   | GitHub OAuth app                                             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | secret                   | Google OAuth client                                          |
| `CONTACT_KEY`                               | secret                   | base64 32-byte key for AES-GCM encryption of contact details |
| `SITE_ADMIN_IDS`                            | var, optional            | comma-separated user ids that can hide any board             |
| `E2E_MOCK_OAUTH`                            | var, dev/test only       | enables the mock sign-in route                               |

## Self-host

1. Create a D1 database and KV namespace on your Cloudflare account and put their ids in `wrangler.jsonc`.
2. Create a GitHub OAuth app and/or Google OAuth client with callback `https://<your-domain>/auth/callback/<provider>`.
3. `wrangler secret put` for `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CONTACT_KEY`.
4. `pnpm db:migrate:remote && pnpm run deploy`.

Google shows an "unverified app" screen until the OAuth client is verified; fine for a hobby board.

## License

MIT. Non-commercial hobby project by [Emtiaz Zahid](https://github.com/emtiazzahid).
