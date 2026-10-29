/**
 * Copies published content out of WordPress into this site's database:
 * categories, tags, authors, posts, pages, featured images and every file the
 * articles link to under /wp-content/uploads/. Reads only WordPress's public
 * REST API; nothing on WordPress is changed.
 *
 * Safe to run again: records are matched by their WordPress id and updated,
 * so a final run just before launch picks up anything published since.
 *
 *   npm run import:wordpress                       # from WORDPRESS_URL (default https://stephenlegal.ng)
 *   npm run import:wordpress -- --limit=20         # first 20 posts only (a quick test)
 *   npm run import:wordpress -- --media=link       # keep files on WordPress instead of copying them
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { cleanArticleHtml } from "../lib/sanitize.ts";
import { putFile } from "../lib/storage.ts";
import { cleanExcerpt, decodeEntities } from "../lib/text.ts";
import { connect } from "./_db.ts";

const args = Object.fromEntries(
	process.argv.slice(2).map((a) => {
		const [k, v] = a.replace(/^--/, "").split("=");
		return [k, v ?? "true"];
	}),
);
const SOURCE = (args.source || process.env.WORDPRESS_URL || "https://stephenlegal.ng").replace(/\/+$/, "");
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const COPY_MEDIA = args.media !== "link";
// The live site and the address WordPress links still use for its own files.
const ORIGINS = [...new Set([SOURCE, "https://stephenlegal.ng", "http://stephenlegal.ng", "https://www.stephenlegal.ng"])];
const SKIP_PAGES = new Set(["login", "register", "edit-profile", "password-reset", "sample-page", "bookmark"]);

const sql = connect();
const report = { posts: 0, pages: 0, categories: 0, tags: 0, authors: 0, files: 0, failed: [] as { url: string; error: string }[] };

/* ---------- HTTP, gently: the WordPress host refuses bursts ---------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, kind: "json" | "file" = "json"): Promise<Response> {
	let last = "";
	for (let attempt = 0; attempt < 7; attempt++) {
		try {
			const res = await fetch(url, { headers: { Accept: kind === "json" ? "application/json" : "*/*", "User-Agent": "StephenLegal-Migration/1.0" } });
			if (res.ok) return res;
			if (res.status === 400 || res.status === 404) return res;
			last = `HTTP ${res.status}`;
		} catch (e) {
			last = (e as Error).message;
		}
		const wait = Math.min(30000, 1000 * 2 ** attempt);
		process.stdout.write(`  … ${last}, retrying in ${wait / 1000}s\n`);
		await sleep(wait);
	}
	throw new Error(`${last} for ${url}`);
}

async function* pages<T>(path: string, query: Record<string, string>): AsyncGenerator<T[]> {
	for (let page = 1; ; page++) {
		const url = new URL(`${SOURCE}/wp-json/wp/v2/${path}`);
		for (const [k, v] of Object.entries({ ...query, page: String(page) })) url.searchParams.set(k, v);
		const res = await get(url.toString());
		if (res.status === 400) return; // past the last page
		const items = (await res.json()) as T[];
		if (!items.length) return;
		yield items;
		if (page >= Number(res.headers.get("x-wp-totalpages") || page)) return;
		await sleep(400);
	}
}

/* ---------- Files ---------- */

const UPLOADS = /\/wp-content\/uploads\/(.+)$/;
const fileCache = new Map<string, { id: number; url: string } | null>();

/** The full-size original for a resized copy ("photo-300x200.jpg" → "photo.jpg"). */
function originalOf(url: string): string {
	return url.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1").split(/[?#]/)[0];
}

function isUpload(url: string): boolean {
	return ORIGINS.some((o) => url.startsWith(`${o}/wp-content/uploads/`)) || /^https?:\/\/[^/]*stephenlegal\.ng\/wp-content\/uploads\//.test(url);
}

type MediaMeta = { wpId?: number; alt?: string; caption?: string; width?: number; height?: number; mime?: string };

async function importFile(sourceUrl: string, meta: MediaMeta = {}): Promise<{ id: number; url: string } | null> {
	const original = originalOf(sourceUrl);
	if (fileCache.has(original)) return fileCache.get(original)!;
	const key = original.match(UPLOADS)?.[1] ?? original.split("/").pop()!;

	const existing = await sql<{ id: number; url: string }[]>`select id, url from media where original_url = ${original}`;
	let row = existing[0] ?? null;
	if (!row) {
		try {
			let url = original;
			let { width, height, mime } = meta;
			let size: number | null = null;
			if (COPY_MEDIA) {
				let res = await get(original, "file");
				// Some articles only ever used a resized copy; fall back to it.
				if (!res.ok && original !== sourceUrl) res = await get(sourceUrl, "file");
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const body = Buffer.from(await res.arrayBuffer());
				mime = res.headers.get("content-type")?.split(";")[0] || mime || "application/octet-stream";
				if (mime.startsWith("image/") && !mime.includes("svg")) {
					const info = await sharp(body).metadata().catch(() => null);
					width = info?.width ?? width;
					height = info?.height ?? height;
				}
				size = body.length;
				url = (await putFile(key, body, mime)).url;
				report.files++;
			}
			const inserted = await sql<{ id: number; url: string }[]>`
				insert into media (url, storage_key, original_url, mime, width, height, size_bytes, alt, caption, wp_id)
				values (${url}, ${key}, ${original}, ${mime || "image/jpeg"}, ${width ?? null}, ${height ?? null}, ${size}, ${meta.alt ?? ""}, ${meta.caption ?? ""}, ${meta.wpId ?? null})
				on conflict (storage_key) do update set original_url = excluded.original_url
				returning id, url`;
			row = inserted[0];
		} catch (e) {
			report.failed.push({ url: original, error: (e as Error).message });
			console.warn(`  ! could not copy ${original}: ${(e as Error).message}`);
			fileCache.set(original, null);
			return null;
		}
	} else if (meta.wpId || meta.alt) {
		await sql`update media set wp_id = coalesce(wp_id, ${meta.wpId ?? null}), alt = case when alt = '' then ${meta.alt ?? ""} else alt end where id = ${row.id}`;
	}
	fileCache.set(original, row);
	return row;
}

/** Copies every uploads file the HTML refers to, then returns the HTML with their new addresses. */
async function localiseContent(html: string): Promise<string> {
	const urls = new Set<string>();
	for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) if (isUpload(m[1])) urls.add(m[1]);
	for (const m of html.matchAll(/srcset=["']([^"']+)["']/g)) for (const part of m[1].split(",")) {
		const u = part.trim().split(/\s+/)[0];
		if (isUpload(u)) urls.add(u);
	}
	const map = new Map<string, string>();
	for (const u of urls) {
		const file = await importFile(decodeEntities(u));
		if (file) map.set(originalOf(decodeEntities(u)), file.url);
	}
	return cleanArticleHtml(html, { siteOrigins: ORIGINS, mapUrl: (u) => (isUpload(u) ? map.get(originalOf(u)) : undefined) });
}

/* ---------- Taxonomies and authors ---------- */

type RawTerm = { id: number; name: string; slug: string; description?: string; parent?: number };

async function importTerms(taxonomy: "category" | "tag") {
	const path = taxonomy === "category" ? "categories" : "tags";
	const parents: [number, number][] = [];
	for await (const batch of pages<RawTerm>(path, { per_page: "100", _fields: "id,name,slug,description,parent" })) {
		for (const t of batch) {
			await sql`
				insert into terms (taxonomy, slug, name, description, wp_id)
				values (${taxonomy}, ${t.slug}, ${decodeEntities(t.name)}, ${decodeEntities(t.description || "")}, ${t.id})
				on conflict (taxonomy, slug) do update set name = excluded.name, description = excluded.description, wp_id = excluded.wp_id`;
			if (t.parent) parents.push([t.id, t.parent]);
			report[taxonomy === "category" ? "categories" : "tags"]++;
		}
	}
	for (const [child, parent] of parents) {
		await sql`update terms set parent_id = (select id from terms where taxonomy = ${taxonomy} and wp_id = ${parent}) where taxonomy = ${taxonomy} and wp_id = ${child}`;
	}
}

type RawAuthor = { id: number; name: string; slug: string; description?: string; avatar_urls?: Record<string, string> };
const authorIds = new Map<number, number>();

async function importAuthor(a: RawAuthor | undefined): Promise<number | null> {
	if (!a?.slug) return null;
	if (authorIds.has(a.id)) return authorIds.get(a.id)!;
	const [row] = await sql<{ id: number }[]>`
		insert into authors (slug, name, bio, avatar_url, wp_id)
		values (${a.slug}, ${decodeEntities(a.name)}, ${decodeEntities(a.description || "")}, ${a.avatar_urls?.["96"] ?? null}, ${a.id})
		on conflict (slug) do update set name = excluded.name, bio = excluded.bio, avatar_url = excluded.avatar_url, wp_id = excluded.wp_id
		returning id`;
	authorIds.set(a.id, row.id);
	report.authors = authorIds.size;
	return row.id;
}

/* ---------- Posts and pages ---------- */

type RawMedia = { id: number; source_url: string; alt_text?: string; caption?: { rendered: string }; mime_type?: string; media_details?: { width?: number; height?: number }; code?: string };
type RawPost = {
	id: number;
	slug: string;
	date_gmt: string;
	modified_gmt: string;
	title: { rendered: string };
	content: { rendered: string };
	excerpt: { rendered: string; protected?: boolean };
	sticky?: boolean;
	categories?: number[];
	tags?: number[];
	yoast_head_json?: { title?: string; description?: string };
	_embedded?: { author?: RawAuthor[]; "wp:featuredmedia"?: RawMedia[] };
};

async function importEntry(type: "post" | "page", p: RawPost) {
	const title = decodeEntities(p.title.rendered).replace(/<[^>]+>/g, "").trim();
	const content = await localiseContent(p.content.rendered);

	// Keep the excerpt only when an editor wrote one (WordPress otherwise repeats the opening lines).
	const excerpt = p.excerpt.protected ? "" : cleanExcerpt(p.excerpt.rendered);
	const opening = cleanExcerpt(p.content.rendered).slice(0, 60);
	const manualExcerpt = excerpt && !opening.startsWith(excerpt.replace(/…$/, "").slice(0, 60)) ? excerpt : "";

	// Yoast titles are kept only when they differ from the default "Title - Stephen Legal".
	const yoastTitle = decodeEntities(p.yoast_head_json?.title || "");
	const seoTitle = yoastTitle && yoastTitle !== `${title} - Stephen Legal` ? yoastTitle : "";
	const seoDescription = decodeEntities(p.yoast_head_json?.description || "");

	const media = p._embedded?.["wp:featuredmedia"]?.[0];
	const featured =
		media && !media.code && media.source_url
			? await importFile(media.source_url, {
					wpId: media.id,
					alt: decodeEntities(media.alt_text || ""),
					caption: cleanExcerpt(media.caption?.rendered || ""),
					width: media.media_details?.width,
					height: media.media_details?.height,
					mime: media.mime_type,
				})
			: null;
	const authorId = await importAuthor(p._embedded?.author?.[0]);

	const [row] = await sql<{ id: number }[]>`
		insert into posts (type, slug, title, excerpt, content, status, published_at, modified_at, author_id, featured_media_id, seo_title, seo_description, sticky, wp_id)
		values (${type}, ${decodeURIComponent(p.slug)}, ${title}, ${manualExcerpt}, ${content}, 'published', ${`${p.date_gmt}Z`}, ${`${p.modified_gmt}Z`},
			${authorId}, ${featured?.id ?? null}, ${seoTitle}, ${seoDescription}, ${Boolean(p.sticky)}, ${p.id})
		on conflict (type, slug) do update set
			title = excluded.title, excerpt = excluded.excerpt, content = excluded.content, status = excluded.status,
			published_at = excluded.published_at, modified_at = excluded.modified_at, author_id = excluded.author_id,
			featured_media_id = excluded.featured_media_id, seo_title = excluded.seo_title, seo_description = excluded.seo_description,
			sticky = excluded.sticky, wp_id = excluded.wp_id
		-- An article edited in the new admin since WordPress last changed it is left alone.
		where posts.modified_at <= excluded.modified_at
		returning id`;
	if (!row) return;

	if (type === "post") {
		await sql`delete from post_terms where post_id = ${row.id}`;
		const termIds = [
			...(p.categories ?? []).map((id, i) => ({ taxonomy: "category", id, i })),
			...(p.tags ?? []).map((id, i) => ({ taxonomy: "tag", id, i })),
		];
		for (const t of termIds) {
			await sql`
				insert into post_terms (post_id, term_id, position)
				select ${row.id}, id, ${t.i} from terms where taxonomy = ${t.taxonomy} and wp_id = ${t.id}
				on conflict do nothing`;
		}
	}
}

async function importAll(type: "post" | "page") {
	const fields = "id,slug,date_gmt,modified_gmt,title,content,excerpt,sticky,categories,tags,yoast_head_json,_links,_embedded";
	let n = 0;
	for await (const batch of pages<RawPost>(type === "post" ? "posts" : "pages", {
		per_page: type === "post" ? "20" : "50",
		orderby: "id",
		order: "asc",
		_embed: "author,wp:featuredmedia",
		_fields: fields,
	})) {
		for (const p of batch) {
			if (type === "page" && SKIP_PAGES.has(p.slug)) continue;
			if (n >= LIMIT && type === "post") return;
			await importEntry(type, p);
			n++;
			report[type === "post" ? "posts" : "pages"]++;
			if (n % 10 === 0) console.log(`  ${n} ${type}s…`);
		}
	}
}

/* ---------- Run ---------- */

console.log(`Importing from ${SOURCE} (${COPY_MEDIA ? "copying files" : "linking files"}${Number.isFinite(LIMIT) ? `, first ${LIMIT} posts` : ""})`);
console.log("Categories…");
await importTerms("category");
console.log("Tags…");
await importTerms("tag");
console.log("Posts…");
await importAll("post");
console.log("Pages…");
await importAll("page");

mkdirSync(".data", { recursive: true });
writeFileSync(".data/import-report.json", JSON.stringify({ source: SOURCE, finishedAt: new Date().toISOString(), ...report }, null, 2));
console.log(
	`Done: ${report.posts} posts, ${report.pages} pages, ${report.categories} categories, ${report.tags} tags, ${report.authors} authors, ${report.files} files copied.`,
);
if (report.failed.length) console.log(`${report.failed.length} files could not be copied — listed in .data/import-report.json.`);
await sql.end();
