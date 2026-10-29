import { readLocalFile } from "@/lib/storage";

/** Serves files saved to .data/uploads when no Vercel Blob store is configured (local development). */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	const key = (await params).path.join("/");
	const body = await readLocalFile(key);
	if (!body) return new Response("Not found", { status: 404 });
	const ext = key.split(".").pop()?.toLowerCase() ?? "";
	const type: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif", svg: "image/svg+xml", pdf: "application/pdf" };
	return new Response(new Uint8Array(body), {
		headers: {
			"Content-Type": type[ext] ?? "application/octet-stream",
			"Cache-Control": "public, max-age=31536000, immutable",
			"X-Content-Type-Options": "nosniff",
			...(ext === "svg" && { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }),
		},
	});
}
