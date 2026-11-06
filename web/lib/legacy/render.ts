/**
 * Renders the public site from the original theme's markup (lib/legacy/templates.json,
 * made by scripts/build-legacy.ts), filling every story slot from the database so
 * the pages look exactly as they did on WordPress.
 */
import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { applySettings } from "./apply-settings";
import { wireForms } from "./forms";
import templates from "./templates.json";

export type Story = {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	date: Date;
	image: { url: string; alt: string } | null;
	cats: { name: string; slug: string }[];
	author: { name: string; slug: string; avatar: string | null };
};

type Rule = { kind: "latest"; category?: string; offset: number } | { kind: "pinned" } | { kind: "list" };
type GroupDef = { slots: number[]; rule: Rule; pinned?: string[] };

export const T = templates as unknown as {
	css: string[];
	headStyles: string;
	chrome: { top: string; bottom: string };
	home: { bodyClass: string; main: string };
	single: { bodyClass: string; main: string };
	archive: { bodyClass: string; main: string; card: string };
	author: { bodyClass: string; main: string; card: string };
	contact: { bodyClass: string; main: string };
	groups: GroupDef[];
};

/* ---------- Text ---------- */

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const words = (s: string, n: number) => {
	const w = s.trim().split(/\s+/);
	return w.length > n ? w.slice(0, n).join(" ") : s.trim();
};

const plain = (html: string) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();

/** WordPress's date format on this site: "March 21, 2026". */
export const wpDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Africa/Lagos" });

const today = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });

export function badges(cats: { name: string; slug: string }[], cls: string, prefix: string, style = "") {
	const st = style ? ` style="${style}"` : "";
	return cats.map((c) => `<a aria-label="name" class="${cls}" href="/category/${c.slug}/"${st}>\n<span>${prefix}${esc(c.name)}</span>\n</a>`).join("\n");
}

/** WordPress's default "mystery person" picture when an author has none. */
export const avatarOf = (url: string | null, size = 25) => url || `https://secure.gravatar.com/avatar/?s=${size}&d=mm&r=g`;

/* ---------- Stories ---------- */

type Row = {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	content_start: string;
	published_at: Date;
	img_url: string | null;
	img_alt: string | null;
	author_name: string | null;
	author_slug: string | null;
	author_avatar: string | null;
	cats: { name: string; slug: string }[] | null;
};

const STORY = (sql: ReturnType<typeof db>) => sql`
	p.id, p.slug, p.title, p.excerpt, left(p.content, 1500) as content_start, p.published_at,
	m.url as img_url, m.alt as img_alt, a.name as author_name, a.slug as author_slug, a.avatar_url as author_avatar,
	(select json_agg(json_build_object('name', t.name, 'slug', t.slug) order by pt.position)
		from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = p.id and t.taxonomy = 'category') as cats`;

const FROM = (sql: ReturnType<typeof db>) => sql`
	from posts p left join media m on m.id = p.featured_media_id left join authors a on a.id = p.author_id
	where p.type = 'post' and p.status = 'published' and p.published_at <= now()`;

export const toStory = (r: Row): Story => ({
	id: r.id,
	slug: r.slug,
	title: r.title,
	excerpt: r.excerpt ? plain(r.excerpt) : plain(r.content_start),
	date: r.published_at,
	image: r.img_url ? { url: r.img_url, alt: r.img_alt || r.title } : null,
	cats: r.cats ?? [],
	author: { name: r.author_name || "Stephen Azubuike", slug: r.author_slug || "stephenazubuike", avatar: r.author_avatar },
});

export async function latestStories(opts: { category?: string; tag?: string; author?: string; search?: string; offset?: number; limit: number }) {
	const sql = db();
	const rows = await sql<(Row & { total: string })[]>`
		select ${STORY(sql)}, count(*) over () as total ${FROM(sql)}
		${opts.category ? sql`and exists (select 1 from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = p.id and t.taxonomy = 'category' and (t.slug = ${opts.category} or t.parent_id = (select id from terms where taxonomy = 'category' and slug = ${opts.category})))` : sql``}
		${opts.tag ? sql`and exists (select 1 from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = p.id and t.taxonomy = 'tag' and t.slug = ${opts.tag})` : sql``}
		${opts.author ? sql`and a.slug = ${opts.author}` : sql``}
		${opts.search ? sql`and p.search @@ websearch_to_tsquery('english', ${opts.search})` : sql``}
		order by p.published_at desc, p.id desc limit ${opts.limit} offset ${opts.offset ?? 0}`;
	return { stories: rows.map(toStory), total: rows.length ? Number(rows[0].total) : 0 };
}

async function storiesBySlug(slugs: string[]): Promise<Map<string, Story>> {
	if (!slugs.length) return new Map();
	const sql = db();
	const rows = await sql<Row[]>`select ${STORY(sql)} ${FROM(sql)} and p.slug = any(${slugs}::text[])`;
	return new Map(rows.map((r) => [r.slug, toStory(r)]));
}

/** Fills each group of slots that appears in `html` according to its rule. */
async function resolveSlots(html: string): Promise<Map<number, Story>> {
	const used = new Set([...html.matchAll(/\{\{(\d+)\./g)].map((m) => Number(m[1])));
	const groups = T.groups.filter((g) => g.slots.some((s) => used.has(s)));
	const pinned = await storiesBySlug(groups.flatMap((g) => g.pinned ?? []));
	const filled = new Map<number, Story>();
	await Promise.all(
		groups.map(async (g) => {
			let list: Story[] = [];
			if (g.rule.kind === "latest") list = (await latestStories({ category: g.rule.category, offset: g.rule.offset, limit: g.slots.length })).stories;
			else list = (g.pinned ?? []).map((s) => pinned.get(s)).filter((s): s is Story => Boolean(s));
			g.slots.forEach((slot, i) => list[i] && filled.set(slot, list[i]));
		}),
	);
	return filled;
}

/** One story's value for a card token. */
function storyField(s: Story, field: string): string {
	const [name, arg] = field.split(":");
	switch (name) {
		case "href":
			return `/${s.slug}/`;
		case "title":
			return arg && /^\d+$/.test(arg) ? esc(words(s.title, Number(arg))) : esc(s.title);
		case "src":
			return esc(s.image?.url ?? "/legacy/placeholder.svg");
		case "alt":
			return esc(s.image?.alt ?? s.title);
		case "date":
			return wpDate(s.date);
		case "author":
			return esc(s.author.name);
		case "avatar":
			return esc(avatarOf(s.author.avatar));
		case "authorHref":
			return `/author/${s.author.slug}/`;
		case "excerpt":
			return esc(words(s.excerpt, Number(arg) || 20));
		default:
			return "";
	}
}

/** Fills card tokens: {{12.title:6}}, {{12.cats|class|prefix}}; an empty slot's card is removed. */
export function fillCards(html: string, stories: Map<number, Story> | ((slot: number) => Story | undefined)) {
	const get = typeof stories === "function" ? stories : (n: number) => stories.get(n);
	return html
		.replace(/\{\{(\d+)\.cats\|([^|]*)\|([^|}]*)(?:\|([^}]*))?\}\}/g, (_m, n: string, cls: string, prefix: string, style?: string) => {
			const s = get(Number(n));
			return s ? badges(s.cats, cls, prefix, style) : "";
		})
		.replace(/\{\{(\d+)\.([a-zA-Z]+(?::[a-z0-9]+)?)\}\}/g, (_m, n: string, field: string) => {
			const s = get(Number(n));
			return s ? storyField(s, field) : "";
		});
}

/* ---------- Pages ---------- */

/** Header and footer around a page's middle part, all slots filled, with the admin's site settings applied. */
export async function renderPage(main: string, extra: Record<string, string> = {}): Promise<string> {
	let html = `${T.chrome.top}\n${main}\n${T.chrome.bottom}`;
	for (const [k, v] of Object.entries(extra)) html = html.split(`{{${k}}}`).join(v);
	html = html.replace(/\{\{today\}\}/g, today());
	const [slots, settings] = await Promise.all([resolveSlots(html), getSettings()]);
	const f = settings.forms;
	return wireForms(applySettings(fillCards(html, slots), settings), {
		contact: f.contactConfirmation,
		contributor: f.contributorConfirmation,
		newsletter: f.newsletterConfirmation,
	});
}
