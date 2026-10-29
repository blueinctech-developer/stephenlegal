import "server-only";
import { cache } from "react";
import { PLACEMENT_CATEGORIES, REVALIDATE, SITE_URL, WP_URL } from "./config";
import { cleanExcerpt, decodeEntities, readingMinutes } from "./text";

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

export type Post = PostSummary & {
	contentHtml: string;
	manualExcerpt: boolean;
	categories: Term[];
	tags: Term[];
	authorInfo: Author;
	seo: YoastHead | null;
};

export type Page = { id: number; slug: string; title: string; contentHtml: string; modified: string; seo: YoastHead | null };

export type YoastHead = {
	title?: string;
	description?: string;
	canonical?: string;
	robots?: Record<string, string>;
	og_title?: string;
	og_description?: string;
	og_type?: string;
	og_image?: { url: string; width?: number; height?: number }[];
	article_published_time?: string;
	article_modified_time?: string;
	twitter_card?: string;
	schema?: unknown;
};

export type Paged<T> = { items: T[]; total: number; totalPages: number };

/* ---------- Transport ---------- */

export class WpError extends Error {}

type Query = Record<string, string | number | boolean | undefined | (string | number)[]>;

// The shared WordPress host returns 500s under bursts of parallel requests, so cap them.
const MAX_IN_FLIGHT = 3;
let inFlight = 0;
const waiting: (() => void)[] = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
	if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => waiting.push(resolve));
	inFlight++;
	try {
		return await task();
	} finally {
		inFlight--;
		waiting.shift()?.();
	}
}

function wp<T>(path: string, query: Query = {}): Promise<{ data: T; total: number; totalPages: number }> {
	return limited(() => wpRequest<T>(path, query));
}

async function wpRequest<T>(path: string, query: Query): Promise<{ data: T; total: number; totalPages: number }> {
	const url = new URL(`${WP_URL}/wp-json/wp/v2/${path}`);
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === "") continue;
		url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
	}

	// The origin occasionally fails or returns an empty body under load; retry with backoff before failing.
	let lastError: unknown;
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			const res = await fetch(url, {
				headers: { Accept: "application/json" },
				next: { revalidate: REVALIDATE, tags: ["wp"] },
			});
			if (res.status === 400 || res.status === 404) {
				// Out-of-range pages and unknown routes: treat as empty.
				return { data: [] as T, total: 0, totalPages: 0 };
			}
			if (!res.ok) throw new WpError(`WordPress ${res.status} for ${url.pathname}`);
			const text = await res.text();
			if (!text) throw new WpError(`Empty response for ${url.pathname}`);
			return {
				data: JSON.parse(text) as T,
				total: Number(res.headers.get("x-wp-total") || 0),
				totalPages: Number(res.headers.get("x-wp-totalpages") || 0),
			};
		} catch (error) {
			lastError = error;
			await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
		}
	}
	throw lastError instanceof Error ? lastError : new WpError(String(lastError));
}

/** For supporting content: log the failure and render without it rather than failing the page. */
export async function optional<T, F>(promise: Promise<T>, fallback: F): Promise<T | F> {
	try {
		return await promise;
	} catch (error) {
		console.warn(`[wp] optional content unavailable: ${(error as Error).message}`);
		return fallback;
	}
}

/* ---------- Mapping ---------- */

type RawTerm = { id: number; name: string; slug: string; taxonomy?: string; count?: number; description?: string; parent?: number };
type RawMedia = {
	source_url: string;
	alt_text?: string;
	caption?: { rendered: string };
	media_details?: { width?: number; height?: number };
};
type RawAuthor = { id: number; name: string; slug: string; description?: string; avatar_urls?: Record<string, string> };
type RawPost = {
	id: number;
	slug: string;
	link: string;
	date_gmt: string;
	modified_gmt: string;
	title: { rendered: string };
	excerpt: { rendered: string; protected?: boolean };
	content?: { rendered: string };
	categories?: number[];
	tags?: number[];
	yoast_head_json?: YoastHead;
	_embedded?: {
		author?: RawAuthor[];
		"wp:featuredmedia"?: (RawMedia & { code?: string })[];
	};
};

// Terms are not embedded (each carries ~20 KB of Yoast data); categories come from one cached list instead.
const EMBED = "author,wp:featuredmedia";
// Listings leave out the body (Elementor markup is large); reading time is shown only where the body is loaded.
const SUMMARY_FIELDS = "id,slug,link,date_gmt,modified_gmt,title,excerpt,categories,_links,_embedded";

type CatMap = Map<number, Term>;
const categoryMap = async (): Promise<CatMap> => new Map((await getCategories()).map((c) => [c.id, c]));

const term = (t: RawTerm): Term => ({
	id: t.id,
	name: decodeEntities(t.name),
	slug: t.slug,
	...(t.count !== undefined && { count: t.count }),
	...(t.description && { description: decodeEntities(t.description) }),
	...(t.parent !== undefined && { parent: t.parent }),
});

/** WordPress permalinks → paths on this site. */
export function toPath(link: string): string {
	try {
		const url = new URL(link);
		return url.pathname;
	} catch {
		return link;
	}
}

function image(media: RawMedia | undefined): Image | null {
	if (!media?.source_url) return null;
	return {
		url: media.source_url,
		width: media.media_details?.width || 1200,
		height: media.media_details?.height || 675,
		alt: decodeEntities(media.alt_text || ""),
		caption: cleanExcerpt(media.caption?.rendered || ""),
	};
}

function primaryCategory(cats: Term[]): Term | null {
	return cats.find((c) => !PLACEMENT_CATEGORIES.includes(c.slug)) || cats[0] || null;
}

function mapSummary(p: RawPost, catMap: CatMap): PostSummary {
	const cats = (p.categories ?? []).map((id) => catMap.get(id)).filter((t): t is Term => Boolean(t));
	const media = p._embedded?.["wp:featuredmedia"]?.[0];
	return {
		id: p.id,
		slug: p.slug,
		href: toPath(p.link),
		title: decodeEntities(p.title.rendered).replace(/<[^>]+>/g, ""),
		excerpt: p.excerpt.protected ? "" : cleanExcerpt(p.excerpt.rendered),
		date: `${p.date_gmt}Z`,
		modified: `${p.modified_gmt}Z`,
		image: media && !media.code ? image(media) : null,
		category: primaryCategory(cats),
		author: decodeEntities(p._embedded?.author?.[0]?.name || "Stephen Legal"),
		minutes: p.content ? readingMinutes(p.content.rendered) : 0,
	};
}

/** Point canonical/OG URLs at this site when WordPress has moved to another host. */
function rewriteSeo(seo: YoastHead | undefined): YoastHead | null {
	if (!seo) return null;
	if (WP_URL === SITE_URL) return seo;
	const swap = (s: string) => s.split(`${WP_URL}/`).join(`${SITE_URL}/`).split(`${SITE_URL}/wp-content/`).join(`${WP_URL}/wp-content/`);
	return JSON.parse(swap(JSON.stringify(seo))) as YoastHead;
}

function mapPost(p: RawPost, catMap: CatMap, tags: Term[]): Post {
	const summary = mapSummary(p, catMap);
	const a = p._embedded?.author?.[0];
	// WordPress generates an excerpt when none is set; a manual one differs from the content's opening.
	const opening = cleanExcerpt(p.content?.rendered || "").slice(0, 60);
	return {
		...summary,
		contentHtml: p.content?.rendered || "",
		manualExcerpt: Boolean(summary.excerpt) && !opening.startsWith(summary.excerpt.replace(/…$/, "").slice(0, 60)),
		categories: (p.categories ?? []).map((id) => catMap.get(id)).filter((t): t is Term => Boolean(t)),
		tags,
		authorInfo: {
			id: a?.id ?? 0,
			name: summary.author,
			slug: a?.slug ?? "",
			description: decodeEntities(a?.description || ""),
			avatar: a?.avatar_urls?.["96"] ?? null,
		},
		seo: rewriteSeo(p.yoast_head_json),
	};
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
	const catMap = await categoryMap();
	const { data, total, totalPages } = await wp<RawPost[]>("posts", {
		page: q.page ?? 1,
		per_page: q.perPage ?? 12,
		categories: q.categories,
		tags: q.tags,
		author: q.author,
		search: q.search,
		exclude: q.exclude,
		sticky: q.sticky,
		_embed: EMBED,
		_fields: SUMMARY_FIELDS,
	});
	return { items: data.map((p) => mapSummary(p, catMap)), total, totalPages };
}

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
	const [{ data }, catMap] = await Promise.all([wp<RawPost[]>("posts", { slug, _embed: EMBED }), categoryMap()]);
	const p = data[0];
	if (!p) return null;
	const tags = p.tags?.length
		? (await wp<RawTerm[]>("tags", { include: p.tags, per_page: 100, _fields: "id,name,slug" })).data.map(term)
		: [];
	return mapPost(p, catMap, tags);
});

export const getPageBySlug = cache(async (slug: string): Promise<Page | null> => {
	const { data } = await wp<(RawPost & { content: { rendered: string } })[]>("pages", { slug });
	const p = data[0];
	if (!p) return null;
	return {
		id: p.id,
		slug: p.slug,
		title: decodeEntities(p.title.rendered),
		contentHtml: p.content.rendered,
		modified: `${p.modified_gmt}Z`,
		seo: rewriteSeo(p.yoast_head_json),
	};
});

export const getCategories = cache(async (): Promise<Term[]> => {
	const { data } = await wp<RawTerm[]>("categories", { per_page: 100, hide_empty: true, _fields: "id,name,slug,count,description,parent" });
	return data.map(term);
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
	const { data } = await wp<RawTerm[]>("tags", { slug, _fields: "id,name,slug,count,description" });
	return data[0] ? term(data[0]) : null;
});

/**
 * The users endpoint is closed on the live site, so authors are resolved from
 * the author data embedded in recent posts.
 */
export const getAuthorBySlug = cache(async (slug: string): Promise<Author | null> => {
	for (let page = 1; page <= 3; page++) {
		const { data, totalPages } = await wp<RawPost[]>("posts", { page, per_page: 100, _embed: "author", _fields: "id,_links,_embedded" });
		const found = data.map((p) => p._embedded?.author?.[0]).find((a) => a?.slug === slug);
		if (found) {
			return {
				id: found.id,
				name: decodeEntities(found.name),
				slug: found.slug,
				description: decodeEntities(found.description || ""),
				avatar: found.avatar_urls?.["96"] ?? null,
			};
		}
		if (page >= totalPages) break;
	}
	return null;
});

/** Previous (older) and next (newer) posts by date. */
export async function getAdjacent(post: Post): Promise<{ prev: PostSummary | null; next: PostSummary | null }> {
	const date = post.date;
	const [catMap, older, newer] = await Promise.all([
		categoryMap(),
		wp<RawPost[]>("posts", { before: date, per_page: 1, orderby: "date", order: "desc", _fields: "id,slug,link,date_gmt,modified_gmt,title,excerpt,categories" }),
		wp<RawPost[]>("posts", { after: date, per_page: 1, orderby: "date", order: "asc", _fields: "id,slug,link,date_gmt,modified_gmt,title,excerpt,categories" }),
	]);
	return {
		prev: older.data[0] ? mapSummary(older.data[0], catMap) : null,
		next: newer.data[0] ? mapSummary(newer.data[0], catMap) : null,
	};
}

export async function getRelated(post: Post, count = 3): Promise<PostSummary[]> {
	const cat = post.category;
	if (!cat) return [];
	const { items } = await getPosts({ categories: [cat.id], perPage: count, exclude: [post.id] });
	return items;
}

/** All post paths for the sitemap and feed (100 per request). */
export async function getAllPostEntries(): Promise<{ href: string; modified: string }[]> {
	const first = await wp<RawPost[]>("posts", { per_page: 100, page: 1, _fields: "link,modified_gmt" });
	const rest = await Promise.all(
		Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
			wp<RawPost[]>("posts", { per_page: 100, page: i + 2, _fields: "link,modified_gmt" }),
		),
	);
	return [first, ...rest].flatMap((r) => r.data.map((p) => ({ href: toPath(p.link), modified: `${p.modified_gmt}Z` })));
}

export async function getSiteInfo(): Promise<{ name: string; description: string }> {
	try {
		const res = await fetch(`${WP_URL}/wp-json/`, { next: { revalidate: 3600, tags: ["wp"] } });
		const json = (await res.json()) as { name?: string; description?: string };
		return { name: decodeEntities(json.name || "Stephen Legal"), description: decodeEntities(json.description || "") };
	} catch {
		return { name: "Stephen Legal", description: "" };
	}
}
