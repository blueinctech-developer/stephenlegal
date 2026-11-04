import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { renderListing } from "@/lib/legacy/archives";
import { T } from "@/lib/legacy/render";
import { seoMetadata } from "@/lib/seo";

export const revalidate = 300;
export function generateStaticParams() {
	return [];
}

type Props = { params: Promise<{ n: string }> };

const pageNumber = (n: string) => (/^\d+$/.test(n) && Number(n) >= 2 && Number(n) <= 1000 ? Number(n) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const n = pageNumber((await params).n);
	return n ? seoMetadata(null, { title: `Blog - Page ${n}`, path: `/blog/page/${n}/` }) : { title: "Not found", robots: { index: false } };
}

export default async function BlogPaged({ params }: Props) {
	const n = pageNumber((await params).n);
	const html = n && (await renderListing("blog", "", n));
	if (!html) notFound();
	return <LegacyPage html={html} bodyClass={T.archive.bodyClass} />;
}
