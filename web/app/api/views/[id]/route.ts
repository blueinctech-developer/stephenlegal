import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// Best effort: one view per visitor per article per hour on each running server.
const HOUR = 60 * 60 * 1000;
const seen = new Map<string, number>();

/** Counts one read of an article (sent by public/legacy/site.js), as the theme's view counter did. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const id = Number((await params).id);
	if (!Number.isInteger(id) || id <= 0) return new NextResponse(null, { status: 400 });
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	const key = `${ip}:${id}`;
	const now = Date.now();
	if ((seen.get(key) ?? 0) > now - HOUR) return new NextResponse(null, { status: 204 });
	if (seen.size > 20000) seen.clear();
	seen.set(key, now);
	await db()`update posts set views = views + 1 where id = ${id} and type = 'post' and status = 'published'`;
	return new NextResponse(null, { status: 204 });
}
