/**
 * Where uploaded files (images, PDFs) are kept. With BLOB_READ_WRITE_TOKEN set
 * (production on Vercel) files go to Vercel Blob; otherwise to .data/uploads,
 * served by app/uploads/[...path]/route.ts. No server-only import, so the
 * WordPress import script can use it too.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const LOCAL_UPLOADS = path.resolve(process.cwd(), ".data", "uploads");
const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Normalises a key like "2024/05/photo.jpg": lower-case-safe characters, no "..". */
export function safeKey(key: string): string {
	return key
		.split("/")
		.map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, ""))
		.filter(Boolean)
		.join("/");
}

export async function putFile(key: string, body: Buffer, contentType: string): Promise<{ key: string; url: string }> {
	const clean = safeKey(key);
	if (blobConfigured()) {
		const { put } = await import("@vercel/blob");
		const blob = await put(`uploads/${clean}`, body, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true });
		return { key: clean, url: blob.url };
	}
	const file = path.join(LOCAL_UPLOADS, ...clean.split("/"));
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, body);
	return { key: clean, url: `/uploads/${clean}` };
}

export async function deleteFile(key: string, url: string): Promise<void> {
	if (/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url)) {
		const { del } = await import("@vercel/blob");
		await del(url);
		return;
	}
	if (url.startsWith("/uploads/")) await rm(path.join(LOCAL_UPLOADS, ...safeKey(key).split("/")), { force: true });
}

export async function readLocalFile(key: string): Promise<Buffer | null> {
	try {
		return await readFile(path.join(LOCAL_UPLOADS, ...safeKey(key).split("/")));
	} catch {
		return null;
	}
}
