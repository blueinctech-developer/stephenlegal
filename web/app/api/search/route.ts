import { NextResponse, type NextRequest } from "next/server";
import { getPosts } from "@/lib/wp";

/** Quick results for the search dialog. Public data only; responses are cached briefly. */
export async function GET(request: NextRequest) {
	const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
	if (q.length < 2) return NextResponse.json({ results: [] });
	try {
		const { items } = await getPosts({ search: q, perPage: 6 });
		return NextResponse.json(
			{ results: items.map((p) => ({ id: p.id, title: p.title, href: p.href, date: p.date, category: p.category?.name ?? null, image: p.image?.url ?? null })) },
			{ headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
		);
	} catch {
		return NextResponse.json({ error: "Search is unavailable" }, { status: 502 });
	}
}
