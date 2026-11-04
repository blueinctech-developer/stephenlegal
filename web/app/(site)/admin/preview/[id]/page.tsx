import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { requireUser } from "@/lib/auth";
import { getPageBySlug, getPostBySlug } from "@/lib/data";
import { db } from "@/lib/db";
import { renderSingle, renderStaticPage } from "@/lib/legacy/pages";
import { T } from "@/lib/legacy/render";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Preview - Stephen Legal" }, robots: { index: false, follow: false } };

/** An article or page exactly as readers will see it, including drafts. Signed-in users only. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
	await requireUser();
	const id = Number((await params).id);
	const [row] = await db()<{ slug: string; type: string; status: string }[]>`select slug, type, status from posts where id = ${id}`;
	if (!row) notFound();
	const post = row.type === "post" ? await getPostBySlug(row.slug, { includeDrafts: true }) : null;
	const page = row.type === "page" ? await getPageBySlug(row.slug, { includeDrafts: true }) : null;
	if (!post && !page) notFound();
	const html = post ? await renderSingle(post) : await renderStaticPage(page!.slug, page!.title, page!.contentHtml);
	const bar = `<p role="status" style="position:sticky;top:0;z-index:10000;margin:0;padding:10px 16px;background:#143554;color:#fff;font:600 14px/1.4 Inter,sans-serif;text-align:center">Preview${row.status === "draft" ? " of a draft — not visible to readers" : ""}. <a href="/admin/${row.type === "page" ? "pages" : "posts"}/${id}/" style="color:#fff;text-decoration:underline">Back to editing</a></p>`;
	return <LegacyPage html={bar + html} bodyClass={post ? T.single.bodyClass : "page-template-default page wp-theme-forcast ori-inner-page elementor-default elementor-kit-7"} />;
}
