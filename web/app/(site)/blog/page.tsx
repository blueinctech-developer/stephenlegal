import type { Metadata } from "next";
import { Archive } from "@/components/Archive";
import { seoMetadata } from "@/lib/seo";
import { getPageBySlug } from "@/lib/data";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
	const page = await getPageBySlug("blog");
	return seoMetadata(page?.seo ?? null, { title: "All stories", path: "/blog/" });
}

/** The existing /blog/ posts page: every article, newest first. */
export default function BlogPage() {
	return <Archive kicker="Archive" title="All stories" base="/blog/" page={1} query={{}} />;
}
