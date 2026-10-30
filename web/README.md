# Stephen Legal — website and admin

The whole of stephenlegal.ng in one Next.js app: the public site, its own
admin dashboard at `/admin/`, and a Postgres database. WordPress is not used;
`npm run import:wordpress` copies the existing content out of it once (and
again just before launch to pick up anything new).

| Part | Where |
|---|---|
| Public site (animated, interactive) | `app/(site)/`, `components/` |
| Admin dashboard | `app/admin/` |
| Content queries | `lib/data.ts` |
| Database tables | `db/schema.sql` |
| WordPress import | `scripts/import-wordpress.ts` |
| Uploaded files | Vercel Blob in production, `.data/uploads` locally (`lib/storage.ts`) |

## Run it locally

```bash
cp .env.example .env.local      # the defaults work for local development
npm install
npm run db:local                # local Postgres; leave it running in its own terminal
npm run db:migrate              # create the tables
npm run import:wordpress -- --limit=30   # copy 30 articles (drop --limit for everything)
npm run dev                     # http://localhost:3000, admin at /admin/
```

The first visit to `/admin/` asks for the `ADMIN_SETUP_TOKEN` from `.env.local`
and creates the first administrator. Or run
`npm run admin:create -- --email=you@example.com --name="Your Name"`.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## The admin

| Screen | What it does |
|---|---|
| Dashboard | Counts, recent articles, drafts, new messages |
| Articles / Pages | Search and filter; write and edit with a visual editor (headings, bold, links, lists, quotes, images, tables) or raw HTML; draft, publish or schedule; categories, tags, featured image, author; search-engine title and description with a Google preview; preview before publishing |
| Media | Upload images and PDFs (large photos resized), add descriptions, delete unused files |
| Categories & tags | Add, rename, nest and delete |
| Authors | The bylines shown on articles |
| Messages | Everything sent through the Contact and Become a Contributor forms |
| Users | Accounts (administrators only); editors manage content, administrators also manage accounts |
| Account | Your name and password |

Saving refreshes the public site at once; otherwise pages are cached for 5 minutes.
A future publication date schedules an article; it appears within 5 minutes of that time.

Security: passwords are hashed with scrypt; sessions are random tokens in an
HttpOnly cookie, stored only as a hash; repeated wrong passwords are slowed
down; every admin action checks the signed-in user and role; content is cleaned
of scripts and unknown embeds when saved and again when shown.

## What's interactive on the site

| Feature | Where | How |
|---|---|---|
| Headline sets in word by word | Lead story, article titles | CSS keyframes |
| Cards and sections rise into view | All listings | CSS scroll-driven animation (no JS) |
| Hero image drift and feature zoom | Articles, homepage feature band | CSS scroll-driven animation |
| Accent rule sweeps under card images | All cards | CSS hover/focus |
| Header slides away while reading, returns on scroll up | Every page | Small client component |
| Animated menu panel with staggered topics | Header | Motion |
| Latest-headlines ticker with pause button | Under the header | CSS marquee, pauses on hover/focus |
| Topic filter chips with re-flowing cards | Homepage "Latest analysis" | Motion layout animation |
| Instant search (`/` or Ctrl+K) with keyboard selection | Everywhere | Postgres full-text search via `/api/search/` |
| Reading progress bar, live table of contents | Articles | Motion spring, scroll tracking |
| Save for later, copy link, toast | Articles; list at `/bookmark/` | localStorage (this browser only) |
| Back to top | Articles | Motion |
| Page fade-in on navigation | Every page | CSS in `app/(site)/template.tsx` |
| Contact and contributor forms with inline errors and animated confirmation | `/contact/`, `/become-a-contributor/` | Server action (works without JavaScript) |

All movement stops under `prefers-reduced-motion`; the ticker becomes a static row.

## Forms

The Contact and Become a Contributor forms have the same fields as the old
Gravity Forms. Each message is saved under **Messages** in the admin and, when
the `SMTP_*` settings are filled in, emailed to `info@stephenlegal.ng` through
the publication's own mailbox. Spam protection: a hidden field bots fill in, and
at most 5 messages per visitor every 10 minutes. The enrollment number is only
asked for when the visitor answers "Yes" to being a Nigerian lawyer.

## Putting it online (Vercel)

1. **Database:** create a free Postgres database at neon.tech (or in Vercel →
   Storage → Neon). Copy its connection string.
2. **Project:** at vercel.com, **Add New → Project**, import
   `blueinctech-developer/stephenlegal`, set **Root Directory** to `web`.
3. **File storage:** Vercel → Storage → **Blob** → create a **Public** store, and
   connect it to the project with Development, Preview and Production all ticked
   (this adds `BLOB_STORE_ID`). The import runs as Development, and images need
   public addresses.
4. **Settings** (Project → Settings → Environment Variables): `DATABASE_URL`,
   `NEXT_PUBLIC_SITE_URL` (the Vercel address for now), `ADMIN_SETUP_TOKEN`, and
   optionally the `SMTP_*` values. Then **Deploy**.
5. **Copy the content in:** on a computer with the project, put the production
   settings with `npx vercel link` and `npx vercel env pull`, then run
   `npm run db:migrate` and `npm run import:wordpress`. This reads stephenlegal.ng
   and changes nothing there. It takes a while: the old host refuses bursts, so
   the import goes slowly and retries. If it stops, `--from-page=N` resumes at
   that page of 10 articles.
6. **First administrator:** open `/admin/` on the Vercel address and enter the setup code.
   Then remove `ADMIN_SETUP_TOKEN` from the settings.

Any address other than stephenlegal.ng is kept out of search engines (robots.txt
and `X-Robots-Tag: noindex`), so the preview never competes with the live site.

**Launch** (only with the owner's go-ahead): run the import once more to catch
new articles, set `NEXT_PUBLIC_SITE_URL=https://stephenlegal.ng`, add the domain
in Vercel, and point the domain's DNS at Vercel. Keep the WordPress hosting until
the new site has run smoothly for a while; it is the way back.

## Addresses kept from the old site

`/<post-slug>/`, `/<page-slug>/`, `/category/<slug>/` (+ `/page/N/`), `/tag/<slug>/`,
`/author/<slug>/`, `/blog/` (+ `/page/N/`), `/feed/`, `/bookmark/`.
Redirects: `/?s=` → `/search/`, `/page/N/` → `/blog/page/N/`, Yoast sitemaps →
`/sitemap.xml`, old account pages (`/login/` etc.) → `/`, `/wp-admin/` and
`/wp-login.php` → the new admin, `/wp-content/uploads/…` → each file's new address.

Search titles and descriptions written in Yoast are carried over; article
schema (Article, BreadcrumbList, Organization) is generated from the content.
