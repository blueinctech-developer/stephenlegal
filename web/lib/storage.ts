/**
 * Where uploaded files (images, PDFs) are kept, in this order:
 *  - Amazon S3, when S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_MEDIA_BUCKET are set
 *    (as on lexpraxis). Files are public and served from NEXT_PUBLIC_MEDIA_URL, or the
 *    bucket's own address.
 *  - Vercel Blob, when a store is connected (BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN).
 *    Files uploaded there before the move to S3 can still be deleted.
 *  - Otherwise .data/uploads, served by app/uploads/[...path]/route.ts (local development).
 * Every file lives under "uploads/<year>/<month>/<name>" in each store. No server-only
 * import, so command-line scripts (WordPress import, media move) can use it too.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const LOCAL_UPLOADS = path.resolve(process.cwd(), ".data", "uploads");
const blobConfigured = () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

export const s3Configured = () => Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_MEDIA_BUCKET);

/** Public address of the media bucket, without a trailing slash. */
export function mediaBaseUrl(): string {
	const set = (process.env.NEXT_PUBLIC_MEDIA_URL || "").replace(/\/+$/, "");
	if (set) return set;
	const region = process.env.S3_REGION || "us-east-1";
	return `https://${process.env.S3_MEDIA_BUCKET}.s3.${region}.amazonaws.com`;
}

let s3: S3Client | null = null;
export function s3Client(): S3Client {
	s3 ??= new S3Client({
		region: process.env.S3_REGION || "us-east-1",
		endpoint: process.env.S3_ENDPOINT || undefined,
		credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
	});
	return s3;
}

/** Normalises a key like "2024/05/photo.jpg": lower-case-safe characters, no "..". */
export function safeKey(key: string): string {
	return key
		.split("/")
		.map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, ""))
		.filter(Boolean)
		.join("/");
}

/** Uploads one object to the media bucket under exactly this key ("uploads/…"). */
export async function putS3Object(objectKey: string, body: Buffer, contentType: string): Promise<string> {
	await s3Client().send(
		new PutObjectCommand({
			Bucket: process.env.S3_MEDIA_BUCKET!,
			Key: objectKey,
			Body: body,
			ContentType: contentType,
			// File names are unique per upload, so browsers and CDNs may keep them for a year.
			CacheControl: "public, max-age=31536000, immutable",
		}),
	);
	return `${mediaBaseUrl()}/${objectKey}`;
}

export async function putFile(key: string, body: Buffer, contentType: string): Promise<{ key: string; url: string }> {
	const clean = safeKey(key);
	if (s3Configured()) return { key: clean, url: await putS3Object(`uploads/${clean}`, body, contentType) };
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
	if (s3Configured() && url.startsWith(`${mediaBaseUrl()}/`)) {
		await s3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_MEDIA_BUCKET!, Key: url.slice(mediaBaseUrl().length + 1) }));
		return;
	}
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
