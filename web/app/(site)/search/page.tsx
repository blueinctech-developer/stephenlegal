import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { renderListing } from "@/lib/legacy/archives";
import { T } from "@/lib/legacy/render";

type Props = { searchParams: Promise<{ q?: string | string[]; page?: string }> };

const clean = (q: string | string[] | undefined) => (Array.isArray(q) ? q[0] : q || "").trim().slice(0, 100);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
	const q = clean((await searchParams).q);
	// Search results are never indexed.
	return { title: { absolute: `You searched for ${q} - Stephen Legal` }, robots: { index: false, follow: true } };
}

/** Search results (the old /?s= addresses redirect here) in the theme's archive layout. */
export default async function SearchPage({ searchParams }: Props) {
	const sp = await searchParams;
	const q = clean(sp.q);
	const page = Math.min(Math.max(Number(sp.page) || 1, 1), 1000);
	const html = (await renderListing("search", q, page)) ?? (await renderListing("search", q, 1))!;
	return <LegacyPage html={html} bodyClass={T.archive.bodyClass.replace(/\bcategory\S*/g, "") + " search search-results"} />;
}
