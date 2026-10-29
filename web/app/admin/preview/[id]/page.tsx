import Link from "next/link";
import { notFound } from "next/navigation";
import { Article, StaticPage } from "@/components/ArticleView";
import { SiteChrome } from "@/components/SiteChrome";
import { requireUser } from "@/lib/auth";
import { getPageBySlug, getPostBySlug } from "@/lib/data";
import { db } from "@/lib/db";

/** An article or page exactly as readers will see it, including drafts. Signed-in users only. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
	await requireUser();
	const id = Number((await params).id);
	const [row] = await db()<{ slug: string; type: string; status: string }[]>`select slug, type, status from posts where id = ${id}`;
	if (!row) notFound();
	const post = row.type === "post" ? await getPostBySlug(row.slug, { includeDrafts: true }) : null;
	const page = row.type === "page" ? await getPageBySlug(row.slug, { includeDrafts: true }) : null;
	if (!post && !page) notFound();

	return (
		<>
			<p className="adm-preview-bar" role="status">
				Preview{row.status === "draft" ? " of a draft — not visible to readers" : ""}.{" "}
				<Link href={`/admin/${row.type === "page" ? "pages" : "posts"}/${id}/`}>Back to editing</Link>
			</p>
			<SiteChrome>{post ? <Article post={post} /> : <StaticPage page={page!} />}</SiteChrome>
		</>
	);
}
