import "server-only";
import { cache } from "react";
import { PLACEMENT_CATEGORIES, SITE_NAME, SITE_TAGLINE } from "./config";
import { db } from "./db";
import { readingMinutes, truncateWords } from "./text";

/* ---------- Normalised types used by every component ---------- */

export type Term = { id: number; name: string; slug: string; count?: number; description?: string; parent?: number };

export type Image = { url: string; width: number; height: number; alt: string; caption: string };

export type Author = { id: number; name: string; slug: string; description: string; avatar: string | null };

/** Everything a card needs. Serialisable, so it can be passed to client components. */
export type PostSummary = {
	id: number;
	slug: string;
	href: string;
	title: string;
	excerpt: string;
	date: string;
	modified: string;
	image: Image | null;
	category: Term | null;
	author: string;
	minutes: number;
};

/** Search-result title and description an editor set; empty means "use the defaults". */
export type Seo = { title: string; description: string };

export type Post = PostSummary & {
	contentHtml: string;
	manualExcerpt: boolean;
	categories: Term[];
	tags: Term[];
	authorInfo: Author;
	seo: Seo;
};

export type Page = { id: number; slug: string; title: string; contentHtml: string; modified: string; seo: Seo };

export type Paged<T> = { items: T[]; total: number; totalPages: number };

/** For supporting content: log the failure and render without it rather than failing the page. */
export async function optional<T, F>(promise: Promise<T>, fallback: F): Promise<T | F> {
	try {
		return await promise;
	} catch (error) {
		console.warn(`[data] optional content unavailable: ${(error as Error).message}`);
		return fallback;
	}
}

/* ---------- Mapping ---------- */

type SummaryRow = {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	lead: string;
	words: number | null;
	published_at: Date;
	modified_at: Date;
	author_name: string | null;
	img_url: string | null;
	img_width: number | null;
	img_height: number | null;
	img_alt: string | null;
	img_caption: string | null;
	total?: string;
};

const SUMMARY_COLUMNS = (sql: ReturnType<typeof db>) => sql`
	p.id, p.slug, p.title, p.excerpt, p.published_at, p.modified_at,
	left(regexp_replace(p.content, '<[^>]+>', ' ', 'g'), 600) as lead,
	array_length(regexp_split_to_array(trim(regexp_replace(p.content, '<[^>]+>', ' ', 'g')), '\\s+'), 1) as words,
	a.name as author_name,
	m.url as img_url, m.width as img_width, m.height as img_height, m.alt as img_alt, m.caption as img_caption`;

const SUMMARY_JOINS = (sql: ReturnType<typeof db>) => sql`
	left join authors a on a.id = p.author_id
	left join media m on m.id = p.featured_media_id`;

const LIVE = (sql: ReturnType<typeof db>) => sql`p.status = 'published' and p.published_at <= now()`;

const term = (t: { id: number; name: string; slug: string; description?: string; parent_id?: number | null; count?: string | number }): Term => ({
	id: t.id,
	name: t.name,
	slug: t.slug,
	...(t.count !== undefined && { count: Number(t.count) }),
	...(t.description && { description: t.description }),
	...(t.parent_id && { parent: t.parent_id }),
});

function primaryCategory(cats: Term[]): Term | null {
	return cats.find((c) => !PLACEMENT_CATEGORIES.includes(c.slug)) || cats[0] || null;
}

/** Categories for a set of posts, in the order the editor chose them. */
async function categoriesFor(ids: number[]): Promise<Map<number, Term[]>> {
	const map = new Map<number, Term[]>();
	if (!ids.length) return map;
	const sql = db();
	const rows = await sql<{ post_id: number; id: number; name: string; slug: string }[]>`
		select pt.post_id, t.id, t.name, t.slug from post_terms pt join terms t on t.id = pt.term_id
		where t.taxonomy = 'category' and pt.post_id = any(${ids}::int[]) order by pt.post_id, pt.position`;
	for (const r of rows) map.set(r.post_id, [...(map.get(r.post_id) ?? []), term(r)]);
	return map;
}

function toSummary(r: SummaryRow, cats: Term[]): PostSummary {
	return {
		id: r.id,
		slug: r.slug,
		href: `/${r.slug}/`,
		title: r.title,
		excerpt: r.excerpt || truncateWords(r.lead.replace(/\s+/g, " ").trim(), 30),
		date: r.published_at.toISOString(),
		modified: r.modified_at.toISOString(),
		image: r.img_url
			? { url: r.img_url, width: r.img_width || 1200, height: r.img_height || 675, alt: r.img_alt || "", caption: r.img_caption || "" }
			: null,
		category: primaryCategory(cats),
		author: r.author_name || SITE_NAME,
		minutes: Math.max(1, Math.round((r.words ?? 0) / 220)),
	};
}

async function summaries(rows: SummaryRow[]): Promise<PostSummary[]> {
	const cats = await categoriesFor(rows.map((r) => r.id));
	return rows.map((r) => toSummary(r, cats.get(r.id) ?? []));
}

/* ---------- Queries ---------- */

export type PostQuery = {
	page?: number;
	perPage?: number;
	categories?: number[];
	tags?: number[];
	author?: number;
	search?: string;
	exclude?: number[];
	sticky?: boolean;
};

export async function getPosts(q: PostQuery = {}): Promise<Paged<PostSummary>> {
	const sql = db();
	const perPage = Math.min(Math.max(q.perPage ?? 12, 1), 100);
	const page = Math.max(q.page ?? 1, 1);
	const search = q.search?.trim();

	const rows = await sql<SummaryRow[]>`
		select ${SUMMARY_COLUMNS(sql)}, count(*) over () as total
		from posts p ${SUMMARY_JOINS(sql)}
		where p.type = 'post' and ${LIVE(sql)}
		${q.categories?.length ? sql`and exists (select 1 from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = p.id and (t.id = any(${q.categories}::int[]) or t.parent_id = any(${q.categories}::int[])))` : sql``}
		${q.tags?.length ? sql`and exists (select 1 from post_terms pt where pt.post_id = p.id and pt.term_id = any(${q.tags}::int[]))` : sql``}
		${q.author ? sql`and p.author_id = ${q.author}` : sql``}
		${q.exclude?.length ? sql`and p.id <> all(${q.exclude}::int[])` : sql``}
		${q.sticky ? sql`and p.sticky` : sql``}
		${search ? sql`and p.search @@ websearch_to_tsquery('english', ${search})` : sql``}
		order by ${search ? sql`ts_rank(p.search, websearch_to_tsquery('english', ${search})) desc,` : sql``} p.published_at desc, p.id desc
		limit ${perPage} offset ${(page - 1) * perPage}`;

	const total = rows.length ? Number(rows[0].total) : page > 1 ? await countPosts(q) : 0;
	return { items: await summaries(rows), total, totalPages: Math.ceil(total / perPage) };
}

/** Used only when a page past the end is requested, to report the real total. */
async function countPosts(q: PostQuery): Promise<number> {
	const { total } = await getPosts({ ...q, page: 1, perPage: 1 });
	return total;
}

type FullRow = SummaryRow & {
	content: string;
	seo_title: string;
	seo_description: string;
	author_id: number | null;
	author_slug: string | null;
	author_bio: string | null;
	author_avatar: string | null;
};

export const getPostBySlug = cache(async (slug: string, opts: { includeDrafts?: boolean } = {}): Promise<Post | null> => {
	const sql = db();
	const [r] = await sql<FullRow[]>`
		select ${SUMMARY_COLUMNS(sql)}, p.content, p.seo_title, p.seo_description,
			a.id as author_id, a.slug as author_slug, a.bio as author_bio, a.avatar_url as author_avatar
		from posts p ${SUMMARY_JOINS(sql)}
		where p.type = 'post' and p.slug = ${slug} ${opts.includeDrafts ? sql`` : sql`and ${LIVE(sql)}`}`;
	if (!r) return null;
	// Drafts have no publication date yet; show them as if published now.
	r.published_at ??= new Date();
	const terms = await sql<{ id: number; name: string; slug: string; taxonomy: string }[]>`
		select t.id, t.name, t.slug, t.taxonomy from post_terms pt join terms t on t.id = pt.term_id
		where pt.post_id = ${r.id} order by t.taxonomy, pt.position`;
	const categories = terms.filter((t) => t.taxonomy === "category").map(term);
	const summary = toSummary(r, categories);
	return {
		...summary,
		minutes: readingMinutes(r.content),
		contentHtml: r.content,
		manualExcerpt: Boolean(r.excerpt),
		categories,
		tags: terms.filter((t) => t.taxonomy === "tag").map(term),
		authorInfo: { id: r.author_id ?? 0, name: summary.author, slug: r.author_slug ?? "", description: r.author_bio ?? "", avatar: r.author_avatar },
		seo: { title: r.seo_title, description: r.seo_description },
	};
});

export const getPageBySlug = cache(async (slug: string, opts: { includeDrafts?: boolean } = {}): Promise<Page | null> => {
	const sql = db();
	const [r] = await sql<{ id: number; slug: string; title: string; content: string; modified_at: Date; seo_title: string; seo_description: string }[]>`
		select p.id, p.slug, p.title, p.content, p.modified_at, p.seo_title, p.seo_description from posts p
		where p.type = 'page' and p.slug = ${slug} ${opts.includeDrafts ? sql`` : sql`and ${LIVE(sql)}`}`;
	if (!r) return null;
	return { id: r.id, slug: r.slug, title: r.title, contentHtml: r.content, modified: r.modified_at.toISOString(), seo: { title: r.seo_title, description: r.seo_description } };
});

/** Categories with their number of published articles. */
export const getCategories = cache(async (): Promise<Term[]> => {
	const sql = db();
	const rows = await sql<{ id: number; name: string; slug: string; description: string; parent_id: number | null; count: string }[]>`
		select t.id, t.name, t.slug, t.description, t.parent_id,
			(select count(*) from post_terms pt join posts p on p.id = pt.post_id where pt.term_id = t.id and p.type = 'post' and ${LIVE(sql)}) as count
		from terms t where t.taxonomy = 'category' order by t.name`;
	return rows.map(term).filter((t) => (t.count ?? 0) > 0);
});

/** Subject categories with enough articles to navigate to, largest first. */
export async function getTopics(limit = 12, min = 3): Promise<Term[]> {
	const hidden = ["uncategorized", "sponsored", "most-viewed", "editors-choice"];
	return (await getCategories())
		.filter((c) => !hidden.includes(c.slug) && (c.count ?? 0) >= min)
		.sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
		.slice(0, limit);
}

export async function getCategoryBySlug(slug: string): Promise<Term | null> {
	return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export const getTagBySlug = cache(async (slug: string): Promise<Term | null> => {
	const sql = db();
	const [t] = await sql<{ id: number; name: string; slug: string; description: string }[]>`
		select id, name, slug, description from terms where taxonomy = 'tag' and slug = ${slug}`;
	return t ? term(t) : null;
});

export const getAuthorBySlug = cache(async (slug: string): Promise<Author | null> => {
	const sql = db();
	const [a] = await sql<{ id: number; name: string; slug: string; bio: string; avatar_url: string | null }[]>`
		select id, name, slug, bio, avatar_url from authors where slug = ${slug}`;
	return a ? { id: a.id, name: a.name, slug: a.slug, description: a.bio, avatar: a.avatar_url } : null;
});

/** Previous (older) and next (newer) posts by date. */
export async function getAdjacent(post: Post): Promise<{ prev: PostSummary | null; next: PostSummary | null }> {
	const sql = db();
	const [older, newer] = await Promise.all([
		sql<SummaryRow[]>`select ${SUMMARY_COLUMNS(sql)} from posts p ${SUMMARY_JOINS(sql)}
			where p.type = 'post' and ${LIVE(sql)} and p.published_at < ${post.date} order by p.published_at desc limit 1`,
		sql<SummaryRow[]>`select ${SUMMARY_COLUMNS(sql)} from posts p ${SUMMARY_JOINS(sql)}
			where p.type = 'post' and ${LIVE(sql)} and p.published_at > ${post.date} order by p.published_at asc limit 1`,
	]);
	const [prev, next] = await summaries([...older, ...newer]).then((s) => [
		older[0] ? s.find((x) => x.id === older[0].id) ?? null : null,
		newer[0] ? s.find((x) => x.id === newer[0].id) ?? null : null,
	]);
	return { prev, next };
}

export async function getRelated(post: Post, count = 3): Promise<PostSummary[]> {
	const cat = post.category;
	if (!cat) return [];
	const { items } = await getPosts({ categories: [cat.id], perPage: count, exclude: [post.id] });
	return items;
}

/** All post paths for the sitemap. */
export async function getAllPostEntries(): Promise<{ href: string; modified: string }[]> {
	const sql = db();
	const rows = await sql<{ slug: string; modified_at: Date }[]>`
		select p.slug, p.modified_at from posts p where p.type = 'post' and ${LIVE(sql)} order by p.published_at desc`;
	return rows.map((r) => ({ href: `/${r.slug}/`, modified: r.modified_at.toISOString() }));
}

export async function getSiteInfo(): Promise<{ name: string; description: string }> {
	return { name: SITE_NAME, description: SITE_TAGLINE };
}
