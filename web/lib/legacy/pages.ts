/** Article, archive and page views in the original theme's markup. */
import "server-only";
import { prepareContent } from "@/lib/content";
import { SITE_URL } from "@/lib/config";
import { db } from "@/lib/db";
import type { Post } from "@/lib/data";
import { contributorForm } from "./forms";
import { avatarOf, badges, esc, fillCards, renderPage, T, wpDate, type Story } from "./render";

/* ---------- Article ---------- */

const VIEWS_ICON = `<svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.99219 13V5.5" stroke="#585858" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.98438 13V1" stroke="#585858" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 13V10" stroke="#585858" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const cut = (s: string, n: number) => {
	const w = s.trim().split(/\s+/);
	return w.length > n ? `${w.slice(0, n).join(" ")}...` : s;
};

async function neighbours(post: Post): Promise<string> {
	const sql = db();
	const near = (older: boolean) => sql<{ slug: string; title: string; img: string | null }[]>`
		select p.slug, p.title, m.url as img from posts p left join media m on m.id = p.featured_media_id
		where p.type = 'post' and p.status = 'published' and p.published_at <= now() and p.id <> ${post.id}
		and ${older ? sql`(p.published_at, p.id) < (${new Date(post.date)}, ${post.id})` : sql`(p.published_at, p.id) > (${new Date(post.date)}, ${post.id})`}
		order by p.published_at ${older ? sql`desc` : sql`asc`}, p.id ${older ? sql`desc` : sql`asc`} limit 1`;
	const [[prev], [next]] = await Promise.all([near(true), near(false)]);
	const image = (img: string | null) => `<div class="post-image">\n<img src="${esc(img ?? "")}" alt="${esc(post.title)}">\n</div>`;
	const content = (label: string, title: string) => `<div class="post__content">\n<span class="np-btn">${label}</span>\n<h4>${esc(cut(title, 7))}</h4>\n</div>`;
	return `<div class="single__navigation-wrapper">
<div class="more-posts">
<div class="d-flex justify-content-between align-items-center">
${prev ? `<div class="prev-posts">\n<a aria-label="name" class="navi__post-main-item" href="/${prev.slug}/">\n${prev.img ? image(prev.img) : ""}\n${content("Previous Article", prev.title)}\n</a>\n</div>` : ""}
${next ? `<div class="next-posts">\n<a aria-label="name" class="navi__post-main-item" href="/${next.slug}/">\n${content("Next Article", next.title)}\n${next.img ? image(next.img) : ""}\n</a>\n</div>` : ""}
</div>
</div>
</div>`;
}

function share(post: Post): string {
	const url = `${SITE_URL}${post.href}`;
	const title = esc(post.title);
	const popup = (u: string, name: string) =>
		`onClick="window.open('${u}','${name}','width=600,height=300,left='+(screen.availWidth/2-300)+',top='+(screen.availHeight/2-150)+''); return false;"`;
	const fb = `http://www.facebook.com/sharer.php?u=${url}`;
	const tw = `http://twitter.com/share?url=${url}&amp;text=${title}`;
	const wh = `https://api.whatsapp.com/send?text=${url}&amp;text=${title}`;
	return `<div class="share-wrap">
<span class="share-title">Share This Article:</span>
<a aria-label="name" class="fb" ${popup(fb, "Facebook")} href="${fb}"><i class="fab fa-facebook-f"></i></a>
<a aria-label="name" class="tw" ${popup(tw, "Twitter share")} href="${encodeURI(tw)}"><i class="fab fa-x-twitter"></i></a>
<a aria-label="name" class="wh" ${popup(wh, "Linkedin share")} href="${encodeURI(wh)}"><i class="fab fa-whatsapp"></i></a>
<a aria-label="name" class="em" href='mailto:?subject="${title}&${url}"'><i class="fal fa-envelope"></i></a>
</div>`;
}

export async function renderSingle(post: Post): Promise<string> {
	const sql = db();
	const [[avatar], [counter]] = await Promise.all([
		sql<{ avatar_url: string | null }[]>`select avatar_url from authors where slug = ${post.authorInfo.slug}`,
		sql<{ views: number }[]>`select views from posts where id = ${post.id}`,
	]);
	const classes = [
		`post-${post.id}`,
		"post",
		"type-post",
		"status-publish",
		"format-standard",
		post.image ? "has-post-thumbnail" : "",
		"hentry",
		...post.categories.map((c) => `category-${c.slug}`),
		...post.tags.map((t) => `tag-${t.slug}`),
	].filter(Boolean);
	const values: Record<string, string> = {
		"post.id": String(post.id),
		"post.articleClass": classes.join(" "),
		"post.title": esc(post.title),
		"post.avatar": esc(avatarOf(avatar?.avatar_url ?? null)),
		"post.authorHref": `/author/${post.authorInfo.slug}/`,
		"post.author": esc(post.author),
		"post.date": wpDate(new Date(post.date)),
		// The theme's view counter, carried over from WordPress and counted on (app/api/views/).
		"post.views": `<li class="view-wrapper"> ${VIEWS_ICON} <span class="view-ct">${(counter?.views ?? 0).toLocaleString("en-US")} Views</span></li>`,
		"post.excerpt": esc(post.excerpt),
		"post.thumb": post.image ? `<img src="${esc(post.image.url)}" class="img-fluid wp-post-image" alt="${esc(post.image.alt || post.title)}">` : "",
		"post.content": prepareContent(post.contentHtml).html,
		"post.tags": post.tags.map((t) => `<a href="/tag/${t.slug}/" rel="tag">${esc(t.name)}</a>`).join(", "),
		"post.share": share(post),
		"post.neighbours": await neighbours(post),
		"post.href": post.href,
	};
	let main = T.single.main.replace("{{post.date}}</li>", `{{post.date}}</li>\n{{post.views}}`).replace(/\{\{post\.cats\|([^|]*)\|([^|}]*)\|([^}]*)\}\}/, (_m, cls: string, prefix: string, style: string) =>
		badges(post.categories, cls, prefix, style),
	);
	// The tags block is left out entirely when an article has none.
	if (!post.tags.length) main = main.replace(/<div class="post_tags">[\s\S]*?\{\{post\.tags\}\}\s*<\/div>/, "");
	return renderPage(main, values);
}

/* ---------- Archives ---------- */

/** WordPress's numbered pagination: first, last, current ±2, with dots between. */
export function pager(base: string, current: number, total: number): string {
	if (total <= 1) return "";
	const href = (n: number) => (n === 1 ? base : `${base}page/${n}/`);
	const show = new Set([1, total, ...[-2, -1, 0, 1, 2].map((d) => current + d)].filter((n) => n >= 1 && n <= total));
	const items: string[] = [];
	if (current > 1) items.push(`<li><a class="prev page-numbers" href="${href(current - 1)}"><i class="fal fa-chevron-double-left"></i></a></li>`);
	let last = 0;
	for (const n of [...show].sort((a, b) => a - b)) {
		if (n - last > 1) items.push('<li><span class="page-numbers dots">&hellip;</span></li>');
		items.push(n === current ? `<li><span aria-current="page" class="page-numbers current">${n}</span></li>` : `<li><a class="page-numbers" href="${href(n)}">${n}</a></li>`);
		last = n;
	}
	if (current < total) items.push(`<li><a class="next page-numbers" href="${href(current + 1)}"><i class="fal fa-chevron-double-right"></i></a></li>`);
	return `<ul class="styled-pagination text-center d-flex align-items-center justify-content-center mb-0 pl-0">${items.join("")}</ul>`;
}

export type ArchiveView = {
	template: "archive" | "author";
	/** Breadcrumb link text and address, e.g. "Case Law" → /category/case-law/. */
	crumb: { label: string; href: string };
	/** Heading HTML, e.g. 'Category: <span>Case Law</span>'. */
	heading: string;
	stories: Story[];
	base: string;
	page: number;
	totalPages: number;
	author?: { name: string; bio: string; avatar: string | null; count: number };
};

export async function renderArchive(v: ArchiveView): Promise<string> {
	const t = T[v.template];
	const card = t.card.replace(/\{\{(?!\d)/g, "{{0.");
	const items = v.stories.length
		? v.stories.map((s) => fillCards(card, () => s)).join("\n")
		: '<div class="col-12"><p>Sorry, no posts matched your criteria.</p></div>';
	const bio = v.author
		? `<div class="empath__author_bio__Wrapper" ><div class="author-thumb"><img alt='' src='${esc(avatarOf(v.author.avatar, 106))}' class='avatar avatar-106 photo' height='106' width='106' decoding='async'/></div><div class="theme_author_Info"><h4 class="theme_author__Name">${esc(v.author.name)}</h4><p class="theme_author__Description">${esc(v.author.bio)}</p><div class="theme_author_socials_icon"></div></div><div class="auth__total_post text-center"><div class="auth__total_post-inner"><h2>${v.author.count}</h2><p>Articles</p></div></div></div>`
		: "";
	return renderPage(t.main, {
		"archive.crumb": `<li><a aria-label="name" href="${v.crumb.href}">${esc(v.crumb.label)}</a></li>`,
		"archive.heading": v.heading,
		"archive.items": items,
		"archive.pager": pager(v.base, v.page, v.totalPages),
		"archive.authorBio": bio,
	});
}

/* ---------- Plain pages ---------- */

/** A WordPress page (About, Privacy Policy…): the theme's title band, then the content. */
export async function renderStaticPage(slug: string, title: string, html: string): Promise<string> {
	const band = T.archive.main.slice(0, T.archive.main.indexOf('<section class="empath__blog-wrapper'));
	const body = slug === "become-a-contributor" && !html.trim() ? contributorForm() : prepareContent(html).html;
	const main = `${band}<section class="empath__page-wrapper internal__pading">\n<div class="container">\n<div class="row">\n<div class="col-12">\n<div class="entry-content">\n${body}\n</div>\n</div>\n</div>\n</div>\n</section>`;
	return renderPage(main, {
		"archive.crumb": `<li><a aria-label="name" href="#">${esc(title)}</a></li>`,
		"archive.heading": `<span>${esc(title)}</span>`,
	});
}
