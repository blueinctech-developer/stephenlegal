import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive } from "@/components/Archive";
import { parsePaged } from "@/components/Listing";
import { seoMetadata } from "@/lib/seo";
import { getCategoryBySlug } from "@/lib/wp";

export const revalidate = 300;
export function generateStaticParams() {
	return [];
}

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const parsed = parsePaged((await params).path);
	const cat = parsed && (await getCategoryBySlug(parsed.slug));
	if (!parsed || !cat) return { title: "Not found", robots: { index: false } };
	const path = parsed.page > 1 ? `/category/${cat.slug}/page/${parsed.page}/` : `/category/${cat.slug}/`;
	return seoMetadata(null, { title: parsed.page > 1 ? `${cat.name} (page ${parsed.page})` : cat.name, description: cat.description, path });
}

export default async function CategoryPage({ params }: Props) {
	const parsed = parsePaged((await params).path);
	const cat = parsed && (await getCategoryBySlug(parsed.slug));
	if (!parsed || !cat) notFound();
	return (
		<Archive
			kicker="Topic"
			title={cat.name}
			description={cat.description}
			base={`/category/${cat.slug}/`}
			page={parsed.page}
			query={{ categories: [cat.id] }}
			currentTopic={cat.slug}
			crumb
		/>
	);
}
