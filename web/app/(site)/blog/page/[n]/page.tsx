import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive } from "@/components/Archive";
import { seoMetadata } from "@/lib/seo";

export const revalidate = 300;
export function generateStaticParams() {
	return [];
}

type Props = { params: Promise<{ n: string }> };

const pageNumber = (n: string) => (/^\d+$/.test(n) && Number(n) >= 2 && Number(n) <= 1000 ? Number(n) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const n = pageNumber((await params).n);
	return n ? seoMetadata(null, { title: `All stories (page ${n})`, path: `/blog/page/${n}/` }) : { title: "Not found" };
}

export default async function BlogPaged({ params }: Props) {
	const n = pageNumber((await params).n);
	if (!n) notFound();
	return <Archive kicker="Archive" title="All stories" base="/blog/" page={n} query={{}} />;
}
