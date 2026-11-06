# WordPress audit: stephenlegal.ng

Audited on 6 November 2026, read-only. Nothing was changed on the WordPress site.

## Sources

The wp-admin screens couldn't be opened from this side: Cloudflare stops automated
browsers at "Just a moment…", and authentication was not bypassed. The audit instead
uses files exported by the site owner from wp-admin on 4 November 2026:

| File | From |
|---|---|
| `stephenlegal.WordPress.2026-11-04.xml` (15.6 MB) | Tools → Export → All content |
| `gravityforms-export-2026-11-04.json` | Forms → Import/Export → Export Forms |
| `yoast seo text.txt` | Yoast SEO → Tools → Export settings |

It also uses the live homepage saved from the owner's browser, and the 30 October
REST API import.

**Not available**, so documented as unknown rather than guessed:
- the full plugin list with versions and settings (no Plugins screenshot or database)
- user roles and email addresses (the content export lists authors only)
- Settings → General, Reading and Discussion
- Appearance → Widgets as configured (the sidebar is copied from the rendered page)
- Gravity Forms entries (past submissions)
- the theme's licensed font files

The database backup or the remaining screenshots would close these gaps.

## Site

| | |
|---|---|
| Title | Stephen Legal |
| Tagline | Law is dynamic and we're at the corridors of this dynamism. |
| Address | https://stephenlegal.ng, language en-US |
| Theme | Forcast (`forcast`), with Forcast Plugin (`empath` widgets and templates) |
| Page builder | Elementor 3.33 and Elementor Pro |
| Permalinks | `/%postname%/`, `/category/<slug>/`, `/tag/<slug>/`, `/author/<slug>/` |

## Inventory

| Type | Count | Notes |
|---|---|---|
| Articles (posts) | 575 published, 0 drafts | All migrated |
| Pages | 12 (11 published, 1 draft) | See below |
| Media (attachments) | 920 | 582 used by articles; 338 never used (theme demo files, logs, logos). 587 migrated |
| Comments | 2,001 | **None approved.** All are waiting in moderation (1,992 comments, 9 pingbacks or trackbacks), on 52 articles, dated 2025–2026. Readers never saw any of them |
| Categories | 34 | Migrated |
| Tags | 1,700 | Migrated |
| Authors | 17 | 16 with articles (migrated) plus `blueinchost`, the hosting/admin account |
| Menus | 2 | `main-menu` (24 items, the header) and `category-menu` (20 items, not shown on the site) |
| Elementor library | 19 | Default kits (6), saved sections and pages from the theme demo |
| Theme templates (`empath_template`) | 20 | Headers 1–8 and Footers 1–6. The site uses **Header 7 (4869)** and **Footer 5 (5500)**. The search panel is Elementor page 3061 |
| Contact Form 7 forms | 8 | Theme demo leftovers ("Contact form 1", "Contact Form Main"), not used on any page |
| Mailchimp for WP forms | 2 | "Newsletter", not used (the footer uses Gravity Forms 3) |
| Mega menus (`th-mega-menu`) | 4 | "Lifestyle" and "Technology" from the theme demo, not in the live menu |
| Profile Builder forms | 2 | Default registration and edit-profile, behind `/register/` and `/edit-profile/` |
| Additional CSS | 1 active (5 KB) | Copied into the new site |

### Pages

| Page | Address | Status | Built with | Migrated |
|---|---|---|---|---|
| Home | `/` (page `home`) | Published | Elementor (page 4867) | Rebuilt from the original markup |
| Contact | `/contact/` | Published | Elementor (page 33): details, Gravity Form 2, map | Yes |
| Become A Contributor | `/become-a-contributor/` | Published | Elementor: Gravity Form 1 | Form rebuilt; the layout came from Elementor data |
| Privacy Policy | `/privacy-policy/` | Published | Default template | Yes. It still contains WordPress's sample text ("Our website address is: http://forcast.local") |
| Blog | `/blog/` | Published | Posts page | Yes |
| Bookmark | `/bookmark/` | Published | Theme template `bookmark.php` | Yes (bookmarks kept in the reader's browser) |
| Login, Register, Edit Profile, Password Reset | `/login/` etc. | Published | Profile Builder shortcodes | Redirect to the homepage (reader accounts are not used) |
| Sample Page | `/sample-page/` | Published | WordPress default | Not migrated (placeholder) |
| Login (copy) | `/login-2/` | Draft | | Not migrated (duplicate) |

None of the pages has a parent page. One article has a Yoast title or description,
and 93 have a focus keyword (used for Yoast's analysis only, not shown to readers).

### Article data beyond the text

| Data | Found | Plan |
|---|---|---|
| View counts (`_empath_views_count`) | All 575 articles, 455,199 views in total, highest 10,955 | Migrate and show "N Views" as the theme did, counting new views |
| Star ratings (Rate My Post) | Plugin present, but no article has a vote | Nothing to migrate |
| Share counts (Easy Social Share Buttons, `essb_*`) | Cached counts only | Not shown on the site; not migrated |
| Related posts (Jetpack cache) | Cache only | Not migrated |
| Primary category (Yoast) | Some articles | The first category is used, as on the live site |

## Forms (Gravity Forms)

| # | Form | Fields | Notifications | Confirmation |
|---|---|---|---|---|
| 1 | Become A Contributor | Full Name\*, Phone\*, Email\*, "Are you a Nigerian Lawyer ?"\* (Yes/No), Supreme Court Enrollment Number\* (number; shown and required only when the answer is Yes) | Admin: "New submission from {form_title}", all fields, sent to the site admin email | "Thanks for contacting us! We will get in touch with you shortly." |
| 2 | Contact | Full Name\*, Email\*, Phone\*, Message\* (600 characters max) | Admin: as above. Visitor: "We have received your inquiry", "Hi there…, Thank you for getting in touch. We have received your inquiry and will get back to you within one business day." | "Thank you for contacting us! We will get in touch with you shortly." |
| 3 | Subscription (footer) | Email | Admin: as above | "Thank you for signing up. Be on the lookout for our monthly newsletter!" |

Submissions were stored as Gravity Forms entries in the WordPress database. They
weren't part of these exports, so past entries can't be migrated yet. There is no
mailing-list integration on form 3: it only notifies the admin.

## Plugins (seen in the page source and export data)

| Plugin | What it does | In the new system |
|---|---|---|
| Elementor and Elementor Pro | Page layouts, header and footer | Layouts copied as templates |
| Forcast Plugin | Theme widgets (post grids, ticker, sliders) and templates | Rebuilt: story blocks filled from the database |
| Gravity Forms | Contact, contributor and newsletter forms | Rebuilt: forms, storage, notifications, inbox |
| Yoast SEO (Premium) | Titles, descriptions, sitemaps, schema, breadcrumbs | Rebuilt: per-article and per-page SEO fields, sitemap, canonical tags, Article schema |
| Contact Form 7 | Demo forms, not in use | Not needed |
| Mailchimp for WordPress | Demo form, not in use | Not needed |
| Rate My Post | Star ratings, no votes cast | Not needed |
| Profile Builder | Reader login and registration pages | Not needed (pages redirect home) |
| Easy Social Share Buttons | Share counts | The share buttons are kept |
| Jetpack | Related posts cache and similar | Not needed |
| WPBakery traces (`_wpb_*`) | Old page-builder data | Not needed |
| One Click Demo Import | Imported the theme demo (log files in the media library) | Not needed |
| Site Kit, Google AdSense code | Analytics and adverts | The AdSense slot markup is not carried over. Analytics needs the tracking ID |

The exact list of active plugins and their versions is unknown without the Plugins screen.

## SEO settings (Yoast)

- Title formats: articles and pages "Title – Stephen Legal"; author "Name, Author at
  Stephen Legal"; search "You searched for … – Stephen Legal"; 404 "Page not found –
  Stephen Legal". The separator is a dash.
- Not indexed: date archives, empty author archives, post formats. Attachment pages
  are switched off.
- The XML sitemap, Open Graph and Twitter cards are on, and breadcrumbs are on.
- Social profiles in Yoast are empty. The header and footer link to Facebook
  (stephenlegalblog), X (stephen_legal) and Instagram (stephenlegal).
- No Yoast redirects are defined.

## Seen in wp-admin (6 November 2026)

Later the same day, wp-admin was opened read-only through the owner's signed-in Chrome.

**Users:** 23 accounts. 3 are Administrators (@Guemhen, blueinchost, and a third not
shown on the first page). 20 are Subscribers, including the 13 contributing authors,
"Stephen Azubuike siazubuike", "Stephen Legal Admin Admintwo", and 3 accounts with
random names (pb2ti1cd664d, pb9qki9cffc8, pbdxf347b3v7) that look like spam
registrations from the Profile Builder sign-up page. Email addresses were not recorded.

**Plugins:** about 48 installed.

| | Plugins |
|---|---|
| Active | Ad Inserter, Admin and Site Enhancements (ASE), All-in-One WP Migration, Contact Form 7, Duplicate Page, Elementor 4.3.6, Elementor Pro 3.33.1, Envato Market, Rate My Post 4.5.3, Forcast Plugin 1.0.5, Gravity Forms 2.9.19, Mailchimp for WP, One Click Demo Import, Profile Builder, Site Kit by Google, UpdraftPlus, WordPress Importer, WP-Optimize, WPS Hide Login, Yoast SEO and Yoast SEO Premium |
| Inactive | Add Widget After Content, Advanced Editor Tools, Akismet, Chaty Pro, Classic Editor, Classic Widgets, Custom Icons for Elementor, Easy Social Share Buttons, eRoom (Zoom), GDPR Cookie Consent, Hide My WP Ghost, Jetpack, MainWP Child and Child Reports, My Sticky Bar, Really Simple Security, Recent Tweets Widget, Slider Revolution, STM Configurations, Ultimate Member, Wordfence, WP Rocket, WPBakery, WPCode Lite |

None of the inactive plugins affects the site. Among the active ones:
- **Ad Inserter** and **Site Kit** place adverts and analytics. Their codes aren't in the
  exports, so they need copying from those plugins' settings if wanted.
- **WPS Hide Login** moves the WordPress sign-in address. The new site has its own sign-in at `/admin/login/`.

## What the new admin must cover (from this audit)

1. **Content:** articles, pages, categories, tags, authors, media and per-item SEO. Already built.
2. **Enquiries:** the three forms' submissions, with status, notes, search and export.
3. **Forms:** per-form notification address, visitor auto-reply (Contact) and confirmation messages.
4. **Site settings:** name and tagline, contact details, social links, footer text and the header menu.
5. **Views:** migrated counts, shown on articles.
6. **Users:** administrators and editors, with an activity record.
7. **Comments:** none were ever published. A sample of the 2,001 waiting ones is
   nearly all spam: generic praise, crypto-referral names, and links in 1,043 of
   them. The rest are pingbacks from the site's own articles. They aren't migrated or
   recreated; this can be revisited if wanted.
