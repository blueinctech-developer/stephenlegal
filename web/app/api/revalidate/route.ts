import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Called by WordPress after a post is published or updated so changes appear
 * at once instead of within the 5-minute cache window.
 *   POST /api/revalidate/  with header  x-revalidate-secret: <REVALIDATE_SECRET>
 */
export async function POST(request: NextRequest) {
	const secret = process.env.REVALIDATE_SECRET || "";
	const given = request.headers.get("x-revalidate-secret") || "";
	const ok = secret.length >= 32 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
	if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	revalidateTag("wp", "max");
	revalidatePath("/", "layout");
	return NextResponse.json({ revalidated: true });
}
