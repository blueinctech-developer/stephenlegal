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

All movement stops under `prefers-reduced-motion`; the ticker becomes a static row.

## URLs kept from WordPress

`/<post-slug>/`, `/<page-slug>/`, `/category/<slug>/` (+ `/page/N/`), `/tag/<slug>/`,
`/author/<slug>/`, `/blog/` (+ `/page/N/`), `/feed/`, `/bookmark/`.
Redirects: `/?s=` → `/search/`, `/page/N/` → `/blog/page/N/`, Yoast sitemaps →
`/sitemap.xml`, old account pages (`/login/` etc.) → `/`.

SEO titles, descriptions, canonicals, Open Graph and schema come from Yoast's
`yoast_head_json`, unchanged.
