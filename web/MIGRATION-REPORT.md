# StephenLegal migration report

Status on 4 November 2026, branch `feat/exact-replica`. WordPress (stephenlegal.ng)
is untouched and still serves the live site.

## How the copy was made

- **Content:** the WordPress REST API, read on 30 October 2026, imported into the new
  Postgres database (`scripts/import-wordpress.ts`).
- **Design:** WordPress's own page source and stylesheets. The live site has sat behind a
  Cloudflare check since early November, so the page structure was taken from the
  Internet Archive copy of 20 May 2026 (article page from 12 July 2026). It was then
  checked against the live homepage in a browser: same Elementor templates (header
  4869, homepage 4867, search panel 3061, footer 5500), same 106 widgets in the same
  order, same stylesheet files byte for byte, same menu. Which stories each homepage
  block shows was fitted to what the live homepage showed on 4 November.

## Counts

| | Old site | New site |
|---|---|---|
| Articles | 575 | 575 |
| Pages | 11 | 5 (6 left out on purpose: login, register, edit-profile, password-reset, sample-page, bookmark) |
| Categories and tags | 34 + 1,700 | 1,734 |
| Authors | 16 | 16 |
| Images and files used by articles | 589 referenced | 587 copied |

**Missing assets**
- Two files are missing on the old site itself (HTTP 404), so they couldn't be copied:
  - `2017/03/Protest.Npa_.pension.mp4`, a video linked from "Statutory corporations… pensioners"
  - `2017/08/9mobile.com_.ng_-1.png`, an image in the Etisalat article
- Media library files that no article uses were not copied. The WordPress REST API only
  lists what articles use; the full library needs the hosting backup.

## Replicated

- **Shared parts:** header (quick links, date, social icons, logo, menu, contributor
  button), side panel, search overlay and footer. These use the original markup and
  stylesheets, including the site's own custom CSS and colour settings.
- **Homepage:** all sections in the original order, each block filled by the rule it
  follows on the live site, for example "newest 6, skipping the first 2" or "newest
  Case Law". The Highlights ticker, quote slider and post slider move with the theme's
  own settings (jQuery Marquee and Swiper, read from the live site's `forcast-core.js`).
- **Page types:**
  - Article page: badges, title, author, date, excerpt, image, body, tags, share
    buttons, previous/next, and the sidebar with Recent Post, adverts and Top Week.
  - Category, tag and author archives, the blog and search results, with WordPress
    pagination (10 per page).
  - Contact page (Elementor layout with form and map), Privacy Policy, Become a
    Contributor, Bookmark, and the 404 page.
- **Behaviours:** side panel, mobile menu with folding sections, search overlay, sticky
  menu bar, Top/Trending/Latest tabs, dark mode and bookmarks. The theme's own script
  wasn't available, so these were rewritten against its markup in `public/legacy/site.js`.
- **Forms:** Contact (Gravity Forms #2), footer newsletter (#3) and Become a Contributor
  post to `/api/forms/<kind>/`. Every message is saved under **Messages** in the admin,
  and emailed once SMTP is set up.
- **Addresses and search data:** all old addresses kept (`/<slug>/`, `/category/…`,
  `/tag/…`, `/author/…`, `/blog/`, `/page/N/` redirects, `/?s=` redirects to `/search/`,
  `/wp-content/uploads/…` redirects to each file's new address). Yoast titles and
  descriptions, canonical tags, Article schema, the sitemap and the feed are kept.

## Differences that remain

| Item | Why | Fix |
|---|---|---|
| Heading font (NYT Cheltenham) and Font Awesome Pro icons | Licensed theme files; not in the archive and not copied from the live server | Georgia and free Font Awesome are used as stand-ins. Put the theme's `assets/fonts/` files in `public/legacy/wp-content/themes/forcast/assets/fonts/` |
| View counts and comment counts on articles | Not migrated (no data) | Left out rather than showing invented numbers. They need the database backup |
| Comments, drafts, star ratings (Rate My Post) | Not readable through the public API | Database backup |
| Become a Contributor page layout | Built in Elementor; its content didn't come through the API | The form is rebuilt in the same Gravity Forms style, but the surrounding layout is approximate |
| Menus, footer links, widgets and adverts | Copied as they are; not yet editable | Menu and widget editing in the admin is still to be built |
| /about-us/ (linked in the header) | No such page exists in WordPress's page list | Confirm whether it exists on the live site |
| Two theme demo banner images (byteflows.net) | Hot-linked from the theme author's demo site, as on the live site | None needed |

## Admin

The admin is unchanged from `main`:
- articles and pages: write, edit, publish, schedule, unpublish, delete, preview
- categories, tags, media, featured images, authors, users, messages, and search
  titles and descriptions

Previews now render in the original design. Navigation and widget editing is not built
yet.

## Before launch (needs the owner's approval)

1. Provide the WordPress backup (database `.sql`, `wp-content/themes`, `wp-content/uploads`) to close the gaps above.
2. Re-run the import to pick up articles published since 30 October.
3. Review the new site side by side with the live one.
4. Point the domain at Vercel, keeping WordPress and its backups until the new site has run smoothly.

## Regenerating the templates

```bash
node --env-file=.env.local scripts/build-legacy.ts --source=<saved pages folder> --live=<live widget map>
```

The saved-pages folder holds `home.html`, `article.html`, `category.html`,
`author.html` and `contact.html`, plus `assets/` with the theme's files. This writes
`lib/legacy/templates.json` and copies the stylesheets to `public/legacy/`.
