import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { renderListing } from "@/lib/legacy/archives";
import { T } from "@/lib/legacy/render";
import { seoMetadata } from "@/lib/seo";
import { getPageBySlug } from "@/lib/data";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
	const page = await getPageBySlug("blog");
	return seoMetadata(page?.seo ?? null, { title: "Blog", path: "/blog/" });
}

/** The /blog/ posts page: every article, newest first. */
export default async function BlogPage() {
	return <LegacyPage html={(await renderListing("blog", "", 1))!} bodyClass={T.archive.bodyClass} />;
}
