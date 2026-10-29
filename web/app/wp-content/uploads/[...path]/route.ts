import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Old WordPress file addresses (linked from other sites, search results and
 * shared posts) redirect to the file's new home. Resized copies
 * ("photo-300x200.jpg") go to the original.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	const path = (await params).path.join("/").replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
	const sql = db();
	const [row] = await sql<{ url: string }[]>`
		select url from media where storage_key = ${path} or original_url like ${"%/wp-content/uploads/" + path} limit 1`;
	if (!row) return new Response("Not found", { status: 404 });
	return NextResponse.redirect(new URL(row.url, request.url), 301);
}
