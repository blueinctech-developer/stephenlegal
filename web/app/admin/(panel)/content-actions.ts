"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromLagosInput, RESERVED_SLUGS, toSlug } from "@/lib/admin-format";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanArticleHtml } from "@/lib/sanitize";

export type SaveState = { status: "idle" | "saved" | "error"; message?: string; errors?: Record<string, string>; savedAt?: string; slug?: string };

/** Everything public shows content, so any change refreshes the whole site's cached pages. */
function refreshSite() {
	revalidatePath("/", "layout");
}

const str = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

export async function savePost(_prev: SaveState, form: FormData): Promise<SaveState> {
	await requireUser();
	const sql = db();
	const id = Number(form.get("id")) || null;
	const type = form.get("type") === "page" ? "page" : "post";
	const errors: Record<string, string> = {};

	const title = str(form, "title", 300);
	if (!title) errors.title = "Enter a title.";
	const slug = toSlug(str(form, "slug", 200) || title);
	if (!slug) errors.slug = "Enter a web address using letters or numbers.";
	else if (RESERVED_SLUGS.includes(slug)) errors.slug = `“${slug}” is used by the site itself. Choose another web address.`;
	else {
		const [clash] = await sql<{ title: string }[]>`select title from posts where slug = ${slug} and id is distinct from ${id}`;
		if (clash) errors.slug = `“${clash.title}” already uses this web address.`;
	}

	const rawContent = String(form.get("content") ?? "");
	if (rawContent.length > 2_000_000) errors.content = "This article is too long to save (over 2 MB of text).";
	const content = cleanArticleHtml(rawContent);

	const status = form.get("status") === "published" ? "published" : "draft";
	const dateInput = str(form, "published_at", 20);
	let publishedAt = dateInput ? fromLagosInput(dateInput) : null;
	if (dateInput && !publishedAt) errors.published_at = "Enter a valid date and time.";
	if (status === "published" && !publishedAt) publishedAt = new Date();

	const excerpt = str(form, "excerpt", 600);
	const seoTitle = str(form, "seo_title", 120);
	const seoDescription = str(form, "seo_description", 300);
	const authorId = Number(form.get("author_id")) || null;
	const featuredId = Number(form.get("featured_media_id")) || null;
	const sticky = type === "post" && form.get("sticky") === "on";

	if (Object.keys(errors).length) return { status: "error", message: "Check the highlighted fields.", errors };

	const values = {
		type,
		slug,
		title,
		excerpt,
		content,
		status,
		published_at: publishedAt,
		author_id: authorId,
		featured_media_id: featuredId,
		seo_title: seoTitle,
		seo_description: seoDescription,
		sticky,
	};

	let postId = id;
	await sql.begin(async (tx) => {
		if (postId) {
			await tx`update posts set ${tx(values)}, modified_at = now() where id = ${postId}`;
		} else {
			const [row] = await tx<{ id: number }[]>`insert into posts ${tx(values)} returning id`;
			postId = row.id;
		}
		if (type === "post") {
			const categoryIds = form.getAll("categories").map(Number).filter(Boolean);
			const tagNames = String(form.get("tags") ?? "")
				.split(",")
				.map((t) => t.trim().slice(0, 80))
				.filter(Boolean);
			const tagIds: number[] = [];
			for (const name of [...new Set(tagNames)]) {
				const tagSlug = toSlug(name);
				if (!tagSlug) continue;
				const [tag] = await tx<{ id: number }[]>`
					insert into terms (taxonomy, slug, name) values ('tag', ${tagSlug}, ${name})
					on conflict (taxonomy, slug) do update set slug = excluded.slug returning id`;
				tagIds.push(tag.id);
			}
			await tx`delete from post_terms where post_id = ${postId}`;
			const rows = [...categoryIds.map((termId, position) => ({ post_id: postId!, term_id: termId, position })), ...tagIds.map((termId, position) => ({ post_id: postId!, term_id: termId, position }))];
			if (rows.length) await tx`insert into post_terms ${tx(rows)} on conflict do nothing`;
		}
	});

	refreshSite();
	if (!id) redirect(`/admin/${type === "page" ? "pages" : "posts"}/${postId}/?saved=1`);
	return {
		status: "saved",
		message: status === "published" ? (publishedAt && publishedAt > new Date() ? "Saved. It will appear on the site at the scheduled time." : "Saved and live on the site.") : "Draft saved.",
		savedAt: new Date().toISOString(),
		slug,
	};
}

export async function deletePost(form: FormData): Promise<void> {
	await requireUser();
	const id = Number(form.get("id"));
	const [row] = await db()<{ type: string }[]>`delete from posts where id = ${id} returning type`;
	refreshSite();
	redirect(`/admin/${row?.type === "page" ? "pages" : "posts"}/?deleted=1`);
}
