import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { EditorPost } from "./PostEditor";

/** Data for the editor screen: the post itself (or a blank one) plus the category and author lists. */
export async function loadEditor(type: "post" | "page", id: number | null) {
	const sql = db();
	const [categories, authors] = await Promise.all([
		sql<{ id: number; name: string }[]>`select id, name from terms where taxonomy = 'category' order by name`,
		sql<{ id: number; name: string }[]>`select id, name from authors order by name`,
	]);

	if (!id) {
		const blank: EditorPost = {
			id: null,
			type,
			title: "",
			slug: "",
			excerpt: "",
			content: "",
			status: "draft",
			publishedAt: null,
			authorId: null,
			featured: null,
			seoTitle: "",
			seoDescription: "",
			sticky: false,
			categoryIds: [],
			tags: [],
		};
		return { post: blank, categories, authors };
	}

	const [p] = await sql<
		{
			id: number;
			type: "post" | "page";
			title: string;
			slug: string;
			excerpt: string;
			content: string;
			status: "draft" | "published";
			published_at: Date | null;
			author_id: number | null;
			seo_title: string;
			seo_description: string;
			sticky: boolean;
			m_id: number | null;
			m_url: string | null;
			m_alt: string | null;
			m_width: number | null;
			m_height: number | null;
		}[]
	>`
		select p.*, m.id as m_id, m.url as m_url, m.alt as m_alt, m.width as m_width, m.height as m_height
		from posts p left join media m on m.id = p.featured_media_id where p.id = ${id} and p.type = ${type}`;
	if (!p) notFound();
	const terms = await sql<{ id: number; name: string; taxonomy: string }[]>`
		select t.id, t.name, t.taxonomy from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = ${id} order by pt.position`;

	const post: EditorPost = {
		id: p.id,
		type: p.type,
		title: p.title,
		slug: p.slug,
		excerpt: p.excerpt,
		content: p.content,
		status: p.status,
		publishedAt: p.published_at?.toISOString() ?? null,
		authorId: p.author_id,
		featured: p.m_id ? { id: p.m_id, url: p.m_url!, alt: p.m_alt ?? "", width: p.m_width, height: p.m_height } : null,
		seoTitle: p.seo_title,
		seoDescription: p.seo_description,
		sticky: p.sticky,
		categoryIds: terms.filter((t) => t.taxonomy === "category").map((t) => t.id),
		tags: terms.filter((t) => t.taxonomy === "tag").map((t) => t.name),
	};
	return { post, categories, authors };
}
