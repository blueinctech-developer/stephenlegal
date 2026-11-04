/** Category, tag, author, blog and search listings in the original theme's archive layout. */
import "server-only";
import { getAuthorBySlug, getCategoryBySlug, getTagBySlug } from "@/lib/data";
import { esc, latestStories } from "./render";
import { renderArchive } from "./pages";

/** Stories per archive page, as on the WordPress site. */
export const PER_PAGE = 10;

export type ArchiveKind = "category" | "tag" | "author" | "blog" | "search";

/** The listing's name, or null when the category, tag or author does not exist. */
export async function archiveSubject(kind: ArchiveKind, slug: string) {
	if (kind === "category") return (await getCategoryBySlug(slug))?.name ?? null;
	if (kind === "tag") return (await getTagBySlug(slug))?.name ?? null;
	if (kind === "author") return (await getAuthorBySlug(slug))?.name ?? null;
	return kind === "blog" ? "Blog" : slug || " ";
}

/** The page's HTML, or null for an unknown subject or a page past the end. */
export async function renderListing(kind: ArchiveKind, slug: string, page: number): Promise<string | null> {
	const name = await archiveSubject(kind, slug);
	if (!name) return null;
	const { stories, total } = await latestStories({
		category: kind === "category" ? slug : undefined,
		tag: kind === "tag" ? slug : undefined,
		author: kind === "author" ? slug : undefined,
		search: kind === "search" ? slug : undefined,
		offset: (page - 1) * PER_PAGE,
		limit: PER_PAGE,
	});
	const totalPages = Math.ceil(total / PER_PAGE);
	if (page > 1 && page > totalPages) return null;
	const base = kind === "blog" ? "/blog/" : kind === "search" ? `/search/?q=${encodeURIComponent(slug)}&page=` : `/${kind}/${slug}/`;
	const label = { category: "Category", tag: "Tag", author: "Author", blog: "", search: "Search Results for" }[kind];
	const author = kind === "author" ? await getAuthorBySlug(slug) : null;
	const html = await renderArchive({
		template: kind === "author" ? "author" : "archive",
		crumb: { label: kind === "author" ? `Archive for ${name}` : name, href: kind === "search" ? "/search/" : base },
		heading: label ? `${label}: <span>${esc(name)}</span>` : `<span>${esc(name)}</span>`,
		stories,
		base,
		page,
		totalPages,
		...(author && { author: { name: author.name, bio: author.description, avatar: author.avatar, count: total } }),
	});
	// Search results use ?page=N rather than /page/N/.
	return kind === "search" ? html.replace(/href="(\/search\/\?q=[^"]*?&amp;page=|\/search\/\?q=[^"]*?&page=)page\/(\d+)\/"/g, 'href="$1$2"') : html;
}

/** "/category/<slug>/" or "/category/<slug>/page/N/" path parts → slug and page number (null if malformed). */
export function parsePaged(path: string[]): { slug: string; page: number } | null {
	if (path.length === 1) return { slug: path[0], page: 1 };
	if (path.length === 3 && path[1] === "page" && /^\d+$/.test(path[2])) {
		const page = Number(path[2]);
		return page >= 2 && page <= 1000 ? { slug: path[0], page } : null;
	}
	return null;
}
