import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Media library listing for the image picker (signed-in users only). */
export async function GET(request: NextRequest) {
	if (!(await currentUser())) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
	const q = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
	const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
	const perPage = 30;
	const sql = db();
	const rows = await sql<{ id: number; url: string; alt: string; caption: string; width: number | null; height: number | null; mime: string; created_at: Date; total: string }[]>`
		select id, url, alt, caption, width, height, mime, created_at, count(*) over () as total from media
		where mime like 'image/%' ${q ? sql`and (alt ilike ${"%" + q + "%"} or storage_key ilike ${"%" + q + "%"})` : sql``}
		order by created_at desc, id desc limit ${perPage} offset ${(page - 1) * perPage}`;
	const total = rows.length ? Number(rows[0].total) : 0;
	return NextResponse.json(
		{
			items: rows.map((r) => ({ id: r.id, url: r.url, alt: r.alt, caption: r.caption, width: r.width, height: r.height, mime: r.mime, created: r.created_at.toISOString() })),
			total,
			pages: Math.ceil(total / perPage),
		},
		{ headers: { "Cache-Control": "private, no-store" } },
	);
}
