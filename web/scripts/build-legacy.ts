/**
 * Turns saved copies of the old WordPress pages (Forcast theme + Elementor) into
 * the templates the public site renders, so it keeps the exact markup and styles.
 *
 *   node --env-file=.env.local scripts/build-legacy.ts --source=<folder>
 *
 * <folder> holds home.html, article.html, category.html, author.html, contact.html
 * (raw page source, e.g. from the Internet Archive) and assets/ with the theme's
 * files under their original wp-content/... paths.
 *
 * Every story card becomes a numbered slot ({{12.title}} etc.). Each group of slots
 * (one Elementor widget or tab) is matched against the database to work out its
 * rule, e.g. "the 4 newest Case Law articles", so the page keeps updating.
 * Writes lib/legacy/templates.json and copies the stylesheets to public/legacy/.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { connect } from "./_db.ts";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const SOURCE = args.source;
// When the saved homepage was captured: "newest" rules are worked out as of then.
const SNAPSHOT = new Date(args.snapshot || "2026-05-20T06:36:51Z");
if (!SOURCE) throw new Error("Pass --source=<folder with the saved pages>");
const ORIGIN = /https?:\/\/(?:www\.)?stephenlegal\.ng/g;
const sql = connect();

/* ---------- HTML helpers ---------- */

/** The whole element that opens at `start` (balanced on its own tag name). */
function elementAt(html: string, start: number): string {
	const tag = /^<([a-z0-9]+)/i.exec(html.slice(start))![1];
	const re = new RegExp(`<${tag}\\b|</${tag}>`, "gi");
	re.lastIndex = start;
	let depth = 0;
	for (let m; (m = re.exec(html)); ) {
		depth += m[0][1] === "/" ? -1 : 1;
		if (depth === 0) return html.slice(start, m.index + m[0].length);
	}
	return html.slice(start);
}

/** Start of the element whose opening tag contains `marker`. */
const openingOf = (html: string, marker: string, from = 0) => {
	const i = html.indexOf(marker, from);
	return i < 0 ? -1 : html.lastIndexOf("<", i);
};

function bodyOf(file: string): string {
	const h = readFileSync(path.join(SOURCE, file), "utf8");
	return h
		.slice(h.indexOf(">", h.indexOf("<body")) + 1, h.lastIndexOf("</body>"))
		.replace(/<script\b[\s\S]*?<\/script>/g, "")
		.replace(/<noscript\b[\s\S]*?<\/noscript>/g, "")
		.replace(/<!--(?!\{\{)[\s\S]*?-->/g, "")
		.replace(/<ins class="adsbygoogle"[\s\S]*?<\/ins>/g, "")
		.replace(/ (?:srcset|sizes|decoding|fetchpriority|data-post-id)="[^"]*"/g, "")
		.replace(/ (?:srcset|sizes)='[^']*'/g, "")
		.replace(ORIGIN, "")
		.replace(/[ \t]*\n\s*/g, "\n");
}

const bodyClass = (file: string) => /<body[^>]*class="([^"]*)"/.exec(readFileSync(path.join(SOURCE, file), "utf8"))![1];

const decode = (s: string) =>
	s
		.replace(/&#8217;|&rsquo;/g, "’")
		.replace(/&#8216;|&lsquo;/g, "‘")
		.replace(/&#8220;|&ldquo;/g, "“")
		.replace(/&#8221;|&rdquo;/g, "”")
		.replace(/&#8211;|&ndash;/g, "–")
		.replace(/&#8212;|&mdash;/g, "—")
		.replace(/&#038;|&amp;/g, "&")
		.replace(/&#8230;|&hellip;/g, "…")
		.replace(/&nbsp;/g, " ");
const norm = (s: string) => decode(s).replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

/* ---------- Story slots ---------- */

type Known = { id: number; slug: string; title: string; date: Date; cats: string[] };
const known = new Map<string, Known>();
for (const r of await sql<{ id: number; slug: string; title: string; published_at: Date; cats: string[] | null }[]>`
	select p.id, p.slug, p.title, p.published_at,
		(select array_agg(t.slug order by pt.position) from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = p.id and t.taxonomy = 'category') as cats
	from posts p where p.type = 'post' and p.status = 'published'`)
	known.set(r.slug, { id: r.id, slug: r.slug, title: r.title, date: r.published_at, cats: r.cats ?? [] });

const CARD_CLASSES = [
	"bytf__post-grid-clm-item",
	"post__hero-item",
	"bytf__post-tab-item-two",
	"bytf__post-grid-item",
	"bytf__post-list-item-two",
	"bytf__post-overlay-item",
	"post__slider_twq-main",
	"bytf__post-th-item",
	"bytf__post-list-item",
	"bytf__post-grid-item-two",
	"empath__recent-post",
	"bytf__blog-item",
	"bytf__post-blog-item",
];
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Africa/Lagos" });

type Group = { key: string; name: string; slots: number[]; slugs: string[]; rule?: Rule };
type Rule = { kind: "latest"; category?: string; offset: number } | { kind: "pinned" } | { kind: "list" };
let slotCount = 0;

/** Replaces the story inside one card with slot tokens. */
function tokeniseCard(card: string, slug: string, n: number): string {
	const k = known.get(slug)!;
	let out = card.split(`href="/${slug}/"`).join(`href="{{${n}.href}}"`);
	// Featured image.
	out = out.replace(/<img\b([^>]*)>/, (_tag, attrs: string) => {
		const cls = /class="([^"]*)"/.exec(attrs)?.[1] ?? "";
		const thumb = /-150x150\.|-\d{2,3}x\d{2,3}\./.test(attrs) ? ":thumb" : "";
		return `<img src="{{${n}.src${thumb}}}" class="${cls}" alt="{{${n}.alt}}" loading="lazy">`;
	});
	// Title, sometimes cut to a number of words by the theme.
	const want = norm(k.title);
	out = out.replace(/>([^<>]{3,})</g, (whole, text: string) => {
		const t = norm(text);
		if (!t || !want.startsWith(t.replace(/\s*\.+$/, ""))) return whole;
		if (t === want) return `>{{${n}.title}}<`;
		const words = text.trim().replace(/\.{2,}$|…$/, "").split(/\s+/).length;
		const tail = /\.\.\.$|…$/.test(text.trim()) ? "..." : /\.$/.test(text.trim()) && !/\.$/.test(k.title) ? "." : "";
		return `>{{${n}.title:${words}}}${tail}<`;
	});
	out = out.replace(new RegExp(`alt="${k.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"), `alt="{{${n}.alt}}"`);
	// Date, author, excerpt.
	out = out.split(fmtDate(k.date)).join(`{{${n}.date}}`);
	out = out.replace(/href="\/author\/[^/]+\/"([^>]*)>([^<]+)</g, (_w, attrs: string) => `href="{{${n}.authorHref}}"${attrs.replace(/title="Posts by [^"]*"/, `title="Posts by {{${n}.author}}"`)}>{{${n}.author}}<`);
	out = out.replace(/src='https:\/\/secure\.gravatar\.com\/avatar\/[^']*'/g, `src='{{${n}.avatar}}'`);
	out = out.replace(/<p>\s*([^<]{20,})<\/p>/, (_w, text: string) => `<p>{{${n}.excerpt:${text.trim().split(/\s+/).length}}}</p>`);
	// Category badges: one pattern (class, inline style, "- " prefix), repeated for each of the story's categories.
	out = out.replace(
		/(?:<a\b[^>]*?class="([^"]*cate[^"]*)"[^>]*?href="\/category\/[^"]+"[^>]*>\n?<span>([^<]*)<\/span>\n?<\/a>\n?)+/,
		(whole, cls: string, label: string) => {
			const style = /style="([^"]*)"/.exec(whole.slice(0, whole.indexOf(">")))?.[1] ?? "";
			return `{{${n}.cats|${cls}|${label.trimStart().startsWith("-") ? "- " : ""}|${style}}}\n`;
		},
	);
	return out;
}

/** Finds story cards, replaces them with slots and records which widget they belong to. */
function slotify(html: string, groups: Group[], prefix: string): string {
	let out = "";
	let pos = 0;
	const cardRe = new RegExp(`<(div|li)\\b[^>]*class="(?:${CARD_CLASSES.join("|")})[\\s"][^>]*>`, "g");
	for (let m; (m = cardRe.exec(html)); ) {
		if (m.index < pos) continue;
		const card = elementAt(html, m.index);
		const slug = /href="\/([a-z0-9%_-]+)\/"/i.exec(card)?.[1];
		if (!slug || !known.has(slug)) continue;
		const n = slotCount++;
		// The widget (or tab pane) the card sits in.
		const before = html.slice(0, m.index);
		const pane = before.lastIndexOf('class="tab-pane');
		const widget = before.lastIndexOf("data-widget_type=");
		const sidebar = before.lastIndexOf('class="empath__sidebar-item');
		const at = Math.max(pane, widget, sidebar);
		const key = `${prefix}@${at}`;
		let g = groups.find((x) => x.key === key);
		if (!g) {
			// Name the group as the live comparison does: Elementor widget id (+ tab number), or the side panel.
			const id = /data-id="([^"]+)"/.exec(before.slice(before.lastIndexOf("<", widget), before.indexOf(">", widget)))?.[1] ?? "none";
			const tab = pane > widget ? `#${before.slice(widget).split('class="tab-pane').length - 2}` : "";
			const name = before.lastIndexOf('class="hidden-bar"') > widget ? "hiddenbar" : id + tab;
			groups.push((g = { key, name, slots: [], slugs: [] }));
		}
		g.slots.push(n);
		g.slugs.push(slug);
		out += html.slice(pos, m.index) + tokeniseCard(card, slug, n);
		pos = m.index + card.length;
		cardRe.lastIndex = pos;
	}
	return out + html.slice(pos);
}

/** The stories each widget shows on the live site today (--live=<file>, lines "widget-id=slug|slug"). */
const live = new Map<string, string[]>();
if (args.live)
	for (const line of readFileSync(args.live, "utf8").split("\n")) {
		const [name, list] = line.trim().split("=");
		if (!list) continue;
		// Slugs may be shortened; match them to the full ones.
		live.set(name, list.split("|").map((p) => [...known.keys()].find((s) => s.startsWith(p)) ?? p));
	}

/**
 * Works out each group's rule: the newest N stories (of a category, after an offset), or a fixed pick.
 * Fitted to what the live site shows today when that is known (the database is then current too),
 * otherwise to the saved page as of the day it was captured.
 */
async function inferRules(groups: Group[]) {
	const rows = (cutoff: Date) => sql<{ slug: string; cats: string[] | null }[]>`
		select p.slug, (select array_agg(t.slug) from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = p.id and t.taxonomy = 'category') as cats
		from posts p where p.type = 'post' and p.status = 'published' and p.published_at <= ${cutoff} order by p.published_at desc, p.id desc`;
	const now = await rows(new Date());
	const then = await rows(SNAPSHOT);
	const used = new Map<string, number>();
	for (const g of groups) {
		// Widgets repeated for phone and desktop share an id: take their stories in turn.
		const seen = used.get(g.name) ?? 0;
		const fromLive = live.get(g.name)?.slice(seen, seen + g.slots.length);
		used.set(g.name, seen + g.slots.length);
		const slugs = fromLive?.length === g.slots.length && fromLive.every((s) => known.has(s)) ? fromLive : g.slugs;
		const latest = slugs === g.slugs ? then : now;
		const pool = (cat?: string) => latest.filter((p) => !cat || (p.cats ?? []).includes(cat)).map((p) => p.slug);
		const matches = (list: string[]) => {
			const i = list.indexOf(slugs[0]);
			return i >= 0 && slugs.every((s, j) => list[i + j] === s) ? i : -1;
		};
		// One story alone can't show a rule unless it is the very newest (or the live site confirms it).
		const ok = (o: number) => o === 0 || (o > 0 && o <= 20 && (slugs.length > 1 || slugs !== g.slugs));
		let offset = matches(pool());
		if (ok(offset)) {
			g.rule = { kind: "latest", offset };
		} else {
			const shared = slugs.map((s) => known.get(s)!.cats).reduce((a, b) => a.filter((c) => b.includes(c)));
			for (const cat of shared) {
				offset = matches(pool(cat));
				if (ok(offset)) {
					g.rule = { kind: "latest", category: cat, offset };
					break;
				}
			}
		}
		g.rule ??= { kind: "pinned" };
		g.slugs = slugs;
	}
}

/* ---------- Pages ---------- */

function split(file: string) {
	const body = bodyOf(file);
	const headerStart = openingOf(body, 'data-elementor-id="4869"');
	const header = elementAt(body, headerStart);
	const footerStart = openingOf(body, 'data-elementor-id="5500"');
	return { top: body.slice(0, headerStart + header.length), main: body.slice(headerStart + header.length, footerStart), bottom: body.slice(footerStart) };
}

const groups: Group[] = [];
const home = split("home.html");
const article = split("article.html");
const category = split("category.html");
const author = split("author.html");
const contact = split("contact.html");

/** Header and footer, shared by every page; today's date is filled in when rendered. */
const chrome = {
	top: slotify(home.top, groups, "top").replace(/(<div class="date_h">[\s\S]*?<\/svg>)\s*[A-Z][a-z]+day, \d+ [A-Z][a-z]+ \d{4}\s*/g, "$1\n{{today}}\n"),
	bottom: slotify(home.bottom, groups, "bottom"),
};

/** The article page: the story itself becomes {{post.*}}, the sidebar and neighbours become slots. */
function singleTemplate(main: string) {
	const page = readFileSync(path.join(SOURCE, "article.html"), "utf8");
	const slug = /(?:rel="canonical" href|property="og:url" content)="https?:\/\/stephenlegal\.ng\/([^/"]+)\/"/.exec(page)?.[1];
	let t = main;
	// The story body and its parts.
	const content = openingOf(t, 'class="entry-content');
	const contentEl = elementAt(t, content);
	t = t.replace(contentEl, contentEl.replace(/^(<div[^>]*>)[\s\S]*(<\/div>)$/, "$1\n{{post.content}}\n$2"));
	const excerpt = openingOf(t, 'class="post_excerpt"');
	t = t.replace(elementAt(t, excerpt), '<div class="post_excerpt">\n<p>{{post.excerpt}}</p>\n</div>');
	t = t.replace(/(<div class="post__thumb-single">\n?)<img[^>]*>/, "$1{{post.thumb}}");
	t = t.replace(/<h1>[\s\S]*?<\/h1>/, "<h1>{{post.title}}</h1>");
	t = t.replace(
		/(<div class="single_title">\n?)(?:<a\b[^>]*class="empath-cate-badge-seven[^>]*>\n?<span>[^<]*<\/span>\n?<\/a>\n?)+/,
		"$1{{post.cats|empath-cate-badge-seven elementor-common-cate|- |background-color:var(--thm-primary);}}\n",
	);
	t = t.replace(
		/(<li class="authore">\n?)<img[^>]*>\n?<a\b([^>]*)href="\/author\/[^"]+">\s*[^<]*<\/a>/,
		"$1<img alt='' src='{{post.avatar}}' class='avatar avatar-25 photo' height='25' width='25' decoding='async'/>\n<a$2href=\"{{post.authorHref}}\">{{post.author}}</a>",
	);
	t = t.replace(/(<i class="fal fa-calendar"><\/i>)\s*[A-Z][a-z]+ \d{1,2}, \d{4}/, "$1 {{post.date}}");
	// No comment or view counts were migrated: those items are left out rather than showing made-up numbers.
	t = t.replace(/<li class="comment">[\s\S]*?<\/li>\n?/, "").replace(/<li class="view-wrapper">[\s\S]*?<\/li>\n?/, "");
	t = t.replace(/(<h5 class="title">Tagged:<\/h5>\n?)[\s\S]*?(\n?<\/div>)/, "$1{{post.tags}}$2");
	t = t.replace(/<article id="post-\d+" class="[^"]*">/, '<article id="post-{{post.id}}" class="{{post.articleClass}}">');
	const share = openingOf(t, 'class="share-wrap"');
	t = t.replace(elementAt(t, share), "{{post.share}}");
	const nav = openingOf(t, 'class="single__navigation-wrapper"');
	t = t.replace(elementAt(t, nav), "{{post.neighbours}}");
	if (slug) t = t.split(`/${slug}/`).join("{{post.href}}");
	return slotify(t, groups, "single");
}

/** Archive pages: heading and the list of stories become {{archive.*}}; the sidebar stays as slots. */
function archiveTemplate(main: string, prefix: string) {
	let t = main;
	const list = openingOf(t, 'class="empath__blog-wrapper');
	const listEl = elementAt(t, list);
	const firstCard = new RegExp(`<div\\b[^>]*class="(?:${CARD_CLASSES.join("|")})[\\s"]`).exec(listEl);
	const cardSample = firstCard ? elementAt(listEl, firstCard.index) : "";
	const slug = /href="\/([a-z0-9%_-]+)\/"/i.exec(cardSample)?.[1];
	const card = slug && known.has(slug) ? tokeniseCard(cardSample, slug, 0).replace(/\{\{0\./g, "{{") : "";
	// Each story sits in a grid column inside the row; the row's content becomes the list, the pager its links.
	const colStart = listEl.lastIndexOf('<div class="col', firstCard?.index ?? 0);
	const colOpen = listEl.slice(colStart, listEl.indexOf(">", colStart) + 1);
	const rowAt = openingOf(listEl, 'class="row"');
	const row = elementAt(listEl, rowAt);
	const pagerAt = openingOf(listEl, 'class="empath-pagination"');
	const pager = elementAt(listEl, pagerAt);
	const pagerDiv = '<div class="empath-pagination">\n{{archive.pager}}\n</div>';
	// The pager sits inside the row on some templates (author) and after it on others.
	const pagerInRow = row.includes(pager);
	let newList = listEl.replace(row, `${row.slice(0, row.indexOf(">") + 1)}\n{{archive.items}}\n${pagerInRow ? pagerDiv : ""}</div>`);
	if (!pagerInRow) newList = newList.replace(pager, pagerDiv);
	t = t.replace(listEl, newList);
	// Breadcrumb trail, heading and (on author pages) the author's card.
	t = t.replace(/(<div class="empath__bacrumb-inner">\n?<ul><li><a[^>]*href="\/">Home &nbsp;<\/a><\/li>)<li>[\s\S]*?<\/li>/g, "$1{{archive.crumb}}");
	t = t.replace(/(<div class="bar__title">\n?<h2>)[\s\S]*?(<\/h2>)/, "$1{{archive.heading}}$2");
	const bio = openingOf(t, 'class="empath__author_bio__Wrapper"');
	if (bio >= 0) t = t.replace(elementAt(t, bio), "{{archive.authorBio}}");
	return { main: slotify(t, groups, prefix), card: `${colOpen}\n${card}\n</div>` };
}

const templates = {
	css: [] as string[],
	chrome,
	home: { bodyClass: bodyClass("home.html"), main: slotify(home.main, groups, "home") },
	single: { bodyClass: bodyClass("article.html"), main: singleTemplate(article.main) },
	archive: { bodyClass: bodyClass("category.html"), ...archiveTemplate(category.main, "archive") },
	author: { bodyClass: bodyClass("author.html"), ...archiveTemplate(author.main, "author") },
	contact: { bodyClass: bodyClass("contact.html"), main: contact.main },
	groups: [] as { slots: number[]; rule: Rule; pinned?: string[] }[],
	slots: 0,
};
await inferRules(groups);
templates.groups = groups.map((g) => ({ slots: g.slots, rule: g.rule!, ...(g.rule!.kind === "pinned" && { pinned: g.slugs }) }));
templates.slots = slotCount;

/* ---------- Stylesheets ---------- */

const PUBLIC = path.resolve("public/legacy");
const seen = new Set<string>();
for (const file of ["home.html", "article.html", "category.html", "author.html", "contact.html"]) {
	const h = readFileSync(path.join(SOURCE, file), "utf8");
	for (const m of h.matchAll(/<link[^>]+rel=['"]stylesheet['"][^>]*href=['"]([^'"]+)['"]/g)) {
		const rel = m[1].replace(ORIGIN, "").replace(/^\//, "").replace(/\?.*/, "").replace(/&#038;.*/, "");
		if (!rel.startsWith("wp-") || seen.has(rel)) continue;
		seen.add(rel);
		const src = path.join(SOURCE, "assets", rel);
		if (!existsSync(src) || /<html/i.test(readFileSync(src, "utf8").slice(0, 300))) {
			console.warn(`  missing stylesheet: ${rel}`);
			continue;
		}
		mkdirSync(path.dirname(path.join(PUBLIC, rel)), { recursive: true });
		copyFileSync(src, path.join(PUBLIC, rel));
		templates.css.push(`/legacy/${rel}`);
	}
}

/** Theme settings and the site's own CSS, printed inline in the page head by WordPress. */
const head = readFileSync(path.join(SOURCE, "home.html"), "utf8").split("<body")[0];
const headStyles = [...head.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)]
	.filter((m) => !/emoji/.test(m[1]))
	.map((m) => m[2].replace(/\/\*# sourceURL=[^*]*\*\//g, "").trim())
	.join("\n");

/* ---------- Images in the theme's own markup (logos, banners) ---------- */

const mediaByOriginal = new Map(
	(await sql<{ original_url: string; url: string }[]>`select original_url, url from media where original_url is not null`).map((r) => [
		r.original_url.replace(ORIGIN, ""),
		r.url,
	]),
);
let missingImages = 0;
const fixImages = (html: string) =>
	html.replace(/\/wp-content\/(?:uploads|themes)\/[^"' )]+\.(?:jpe?g|png|webp|gif|svg)/gi, (src) => {
		const stored = mediaByOriginal.get(src);
		if (stored) return stored;
		const file = path.join(SOURCE, "assets", src);
		if (existsSync(file) && !/<html/i.test(readFileSync(file, "latin1").slice(0, 300))) {
			mkdirSync(path.dirname(path.join(PUBLIC, src)), { recursive: true });
			copyFileSync(file, path.join(PUBLIC, src));
			return `/legacy${src}`;
		}
		missingImages++;
		return src;
	});
const fixAll = (o: unknown): unknown =>
	typeof o === "string" ? fixImages(o) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === "groups" ? v : fixAll(v)])) : o;
Object.assign(templates, fixAll({ chrome: templates.chrome, home: templates.home, single: templates.single, archive: templates.archive, author: templates.author, contact: templates.contact }));

mkdirSync("lib/legacy", { recursive: true });
writeFileSync("lib/legacy/templates.json", JSON.stringify({ ...templates, headStyles: fixImages(headStyles.replace(ORIGIN, "")) }));
console.log(`${missingImages} theme image references not found (left pointing at /wp-content/uploads/)`);
console.log(`${templates.slots} story slots in ${groups.length} groups:`);
for (const g of groups) console.log(`  ${g.key.padEnd(16)} ${g.name.padEnd(12)} ${String(g.slots.length).padStart(2)} × ${JSON.stringify(g.rule)}`);
console.log(`${templates.css.length} stylesheets copied to public/legacy/`);
await sql.end();
