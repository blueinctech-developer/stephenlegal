# StephenLegal Editorial — WordPress theme

A drop-in replacement for the current Forcast theme on stephenlegal.ng. It changes presentation only:
posts, categories, URLs, Yoast SEO output, RSS feeds, comments, Elementor-built post content and
Gravity Forms all keep working because they are served by WordPress and its plugins, not by the theme.

## Audit of the current site (29 Oct 2026)

| Area | Finding |
| --- | --- |
| Stack | WordPress 7.1.4, Forcast theme, Elementor 3.33, Yoast SEO Premium 20.12, Site Kit, Gravity Forms |
| Content | 575 posts, one author (Stephen Azubuike), 25 categories; Case Law (324), Opinions (109), Trending (50), Law News (35) |
| URLs | `/%postname%/` posts, `/category/<slug>/` archives, `/feed/` RSS |
| Homepage | Elementor page; leads with 2020–21 stories rather than the newest; four `<h1>`s |
| Weight | 54 scripts, 40 stylesheets, ~3.5 MB transferred, 155 images (32 without alt) |
| Navigation | Two-row wrapping menu at laptop widths; the "Technology & Cryptocurrency" item links to `/category/technology/`, which does not exist |
| Content issues (not changed by the theme) | Titles are stored in ALL CAPS; the Privacy Policy page is still WordPress's default sample text and mentions `forcast.local`; copyright reads 2025 |

## Install

1. Back up the site (files and database).
2. Upload `stephenlegal-editorial/` to `wp-content/themes/` (or zip it and use Appearance → Themes → Add New → Upload).
3. Preview it with Appearance → Themes → Live Preview before you activate it.
4. Appearance → Menus: assign a short menu (5–7 top-level items) to **Primary navigation**. If none is assigned,
   the header shows the largest categories. Optionally assign a menu to **Footer — publication links**.
5. Appearance → Customize → **Editorial layout**: choose the Featured insight category, the three homepage desk
   categories and the article disclaimer text.
6. Run *Regenerate Thumbnails* (or `wp media regenerate --only-missing`) so the new `sl-lead`, `sl-card` and
   `sl-thumb` crops exist. Until then WordPress falls back to the nearest existing size.

## Check before going live

- **Forcast-only features.** The Login, Register, Edit Profile, Password Reset and Bookmark pages appear to rely
  on Forcast's built-in user features. Open each in Live Preview. If they are empty, either keep them as they are
  under a plugin or remove them from menus.
- **The homepage.** `front-page.php` replaces the Elementor "Home" page layout. The Elementor page itself stays in the
  database untouched, so you can switch back to the old theme at any time.
- **The disclaimer copy.** The disclaimer under every article is a general-information notice. Confirm the wording.

## Templates and components

| File | Role |
| --- | --- |
| `header.php` | Site header: wordmark or custom logo, section nav, inline search, Menu panel (topics + pages) |
| `footer.php` | Footer: wordmark, archive search, topics, publication links, social links, disclaimer |
| `front-page.php` | Homepage: lead story with a rail, latest analysis mosaic, topics, featured insight, desks, more stories |
| `single.php` | Article: breadcrumbs, headline, byline, hero, table of contents, serif body, disclaimer, share, related |
| `archive.php` / `index.php` | Category, tag, author and date archives, and the posts page |
| `search.php`, `404.php`, `page.php`, `comments.php` | Search results, not found, static pages, comments |
| `inc/template-tags.php` | `sl_card()` (all story-card variants), labels, metadata, topics, pagination, breadcrumbs |
| `inc/content.php` | Heading anchors and table of contents, related posts, homepage de-duplication |

## Design tokens

Space Grotesk handles display type and the interface. Source Serif 4 is used only for long-form article body text.
Palette contrast was checked (WCAG 2.2):

| Pair | Ratio |
| --- | --- |
| Ink `#111318` on paper `#F7F6F2` | 17.2 : 1 |
| Slate `#454953` on paper | 8.3 : 1 |
| Muted meta `#5E626B` on paper | 5.7 : 1 |
| Accent text `#B8341F` on paper | 5.5 : 1 |
| Mist `#C5C8D0` on night `#17191F` | 10.5 : 1 |
| Accent glow `#F26450` on night | 5.6 : 1 |
| Ink on accent `#E54832` (buttons) | 4.7 : 1 |
| Input border `#8A8D94` on paper | 3.1 : 1 |

`#E54832` alone is only 3.7 : 1 on paper. It is used only for markers, rules, focus rings and large type, never for small text.
