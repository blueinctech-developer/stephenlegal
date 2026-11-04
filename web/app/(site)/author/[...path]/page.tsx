import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { archiveSubject, parsePaged, renderListing } from "@/lib/legacy/archives";
import { T } from "@/lib/legacy/render";
import { seoMetadata } from "@/lib/seo";

export const revalidate = 300;
export function generateStaticParams() {
	return [];
}

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const parsed = parsePaged((await params).path);
	const name = parsed && (await archiveSubject("author", parsed.slug));
	if (!parsed || !name) return { title: "Not found", robots: { index: false } };
	const path = parsed.page > 1 ? `/author/${parsed.slug}/page/${parsed.page}/` : `/author/${parsed.slug}/`;
	return seoMetadata(null, { title: `${name}, Author at Stephen Legal${parsed.page > 1 ? ` - Page ${parsed.page}` : ""}`, path });
}

export default async function ListingPage({ params }: Props) {
	const parsed = parsePaged((await params).path);
	const html = parsed && (await renderListing("author", parsed.slug, parsed.page));
	if (!html) notFound();
	return <LegacyPage html={html} bodyClass={T.author.bodyClass} />;
}
