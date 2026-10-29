# Stephen Legal — Next.js front end

An interactive, animated front end for stephenlegal.ng. WordPress stays the CMS:
editors keep writing in WordPress admin, and this app reads published content
from the WordPress REST API (cached for 5 minutes, or refreshed at once through
`/api/revalidate/`).

## Run it

```bash
cp .env.example .env.local   # then edit the values
npm install
npm run dev                  # http://localhost:3000
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

To test without putting load on the live site, point `WORDPRESS_URL` at the local
WordPress Playground described in `../dev/README.md`.

## What's interactive

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
| Instant search (`/` or Ctrl+K) with keyboard selection | Everywhere | `/api/search/` + Motion |
| Reading progress bar, live table of contents | Articles | Motion spring, scroll tracking |
| Save for later, copy link, toast | Articles; list at `/bookmark/` | localStorage (this browser only) |
| Back to top | Articles | Motion |
| Page fade-in on navigation | Every page | CSS in `app/template.tsx` |
| Contact and contributor forms with inline errors and animated confirmation | `/contact/`, `/become-a-contributor/` | Server action (works without JavaScript) |

All movement stops under `prefers-reduced-motion`; the ticker becomes a static row.

## Forms

The Contact and Become a Contributor forms replace the Gravity Forms on those
pages, with the same fields. Messages are emailed to `info@stephenlegal.ng`
through the publication's own mailbox, using the `SMTP_*` settings in
`.env.example` (from the hosting control panel's email account settings).

- Without SMTP settings, `npm run dev` prints messages to the terminal instead
  of sending them; a production build tells the visitor to email or call instead.
- Spam protection: a hidden field bots fill in, and at most 5 messages per
  visitor every 10 minutes.
- The enrollment number is only asked for, and only required, when the visitor
  answers "Yes" to being a Nigerian lawyer.

## Preview on Vercel

A preview runs the new site at its own address while stephenlegal.ng stays as it is.

1. Sign in at vercel.com with the GitHub account that owns this repository.
2. **Add New → Project**, import `blueinctech-developer/stephenlegal`.
3. Set **Root Directory** to `web` (framework is detected as Next.js).
4. Under **Environment Variables**, add:
   - `WORDPRESS_URL` = `https://stephenlegal.ng`
   - `NEXT_PUBLIC_SITE_URL` = the preview address Vercel shows (e.g. `https://stephenlegal.vercel.app`)
   - `REVALIDATE_SECRET` = a long random string
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional for a first preview)
5. **Deploy**. Every pull request then gets its own preview link as well.

Any address other than stephenlegal.ng is kept out of search engines: robots.txt
blocks crawling and every page sends `X-Robots-Tag: noindex`.

The live WordPress host turns away bursts of requests. Pages are cached for
5 minutes, so normal traffic is light, but if a build fails with "WordPress 500"
or "503", redeploy, or ask the host to raise the request limit for `/wp-json/`.

## URLs kept from WordPress

`/<post-slug>/`, `/<page-slug>/`, `/category/<slug>/` (+ `/page/N/`), `/tag/<slug>/`,
`/author/<slug>/`, `/blog/` (+ `/page/N/`), `/feed/`, `/bookmark/`.
Redirects: `/?s=` → `/search/`, `/page/N/` → `/blog/page/N/`, Yoast sitemaps →
`/sitemap.xml`, old account pages (`/login/` etc.) → `/`.

SEO titles, descriptions, canonicals, Open Graph and schema come from Yoast's
`yoast_head_json`, unchanged.
