import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive } from "@/components/Archive";
import { parsePaged } from "@/components/Listing";
import { seoMetadata } from "@/lib/seo";
import { getTagBySlug } from "@/lib/wp";

export const revalidate = 300;
export function generateStaticParams() {
	return [];
}

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const parsed = parsePaged((await params).path);
	const tag = parsed && (await getTagBySlug(parsed.slug));
	if (!parsed || !tag) return { title: "Not found", robots: { index: false } };
	const path = parsed.page > 1 ? `/tag/${tag.slug}/page/${parsed.page}/` : `/tag/${tag.slug}/`;
	return seoMetadata(null, { title: tag.name, description: tag.description, path });
}

export default async function TagPage({ params }: Props) {
	const parsed = parsePaged((await params).path);
	const tag = parsed && (await getTagBySlug(parsed.slug));
	if (!parsed || !tag) notFound();
	return <Archive kicker="Tag" title={tag.name} description={tag.description} base={`/tag/${tag.slug}/`} page={parsed.page} query={{ tags: [tag.id] }} />;
}
