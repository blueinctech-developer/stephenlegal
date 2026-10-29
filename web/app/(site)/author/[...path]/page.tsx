import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive } from "@/components/Archive";
import { parsePaged } from "@/components/Listing";
import { seoMetadata } from "@/lib/seo";
import { getAuthorBySlug } from "@/lib/data";

export const revalidate = 300;
export function generateStaticParams() {
	return [];
}

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const parsed = parsePaged((await params).path);
	const author = parsed && (await getAuthorBySlug(parsed.slug));
	if (!parsed || !author) return { title: "Not found", robots: { index: false } };
	return seoMetadata(null, { title: author.name, description: author.description, path: `/author/${author.slug}/` });
}

export default async function AuthorPage({ params }: Props) {
	const parsed = parsePaged((await params).path);
	const author = parsed && (await getAuthorBySlug(parsed.slug));
	if (!parsed || !author) notFound();
	return <Archive kicker="Author" title={author.name} description={author.description} base={`/author/${author.slug}/`} page={parsed.page} query={{ author: author.id }} />;
}
