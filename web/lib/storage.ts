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

/**
 * One AWS access key serves both S3 (media) and SES (email), so it may be saved under either
 * name: each S3_* value falls back to its SES_* twin (lib/mail.ts does the reverse).
 */
const aws = {
	region: () => process.env.S3_REGION || process.env.SES_REGION || "us-east-1",
	accessKeyId: () => process.env.S3_ACCESS_KEY_ID || process.env.SES_ACCESS_KEY_ID || "",
	secretAccessKey: () => process.env.S3_SECRET_ACCESS_KEY || process.env.SES_SECRET_ACCESS_KEY || "",
	bucket: () => process.env.S3_MEDIA_BUCKET || "",
};

/** Each S3 setting, with the names it may be saved under (for Admin → Media). */
const S3_SETTINGS: [string, () => string][] = [
	["S3_ACCESS_KEY_ID (or SES_ACCESS_KEY_ID)", aws.accessKeyId],
	["S3_SECRET_ACCESS_KEY (or SES_SECRET_ACCESS_KEY)", aws.secretAccessKey],
	["S3_MEDIA_BUCKET", aws.bucket],
];
export const s3Configured = () => S3_SETTINGS.every(([, value]) => Boolean(value()));

/** Where new uploads go, and which S3 settings are missing (names only, never values), for Admin → Media. */
export function storageStatus(): { store: "s3" | "blob" | "local"; bucket?: string; missingS3: string[] } {
	const missingS3 = S3_SETTINGS.filter(([, value]) => !value()).map(([name]) => name);
	if (!missingS3.length) return { store: "s3", bucket: aws.bucket(), missingS3 };
	return { store: blobConfigured() ? "blob" : "local", missingS3 };
}

/** Public address of the media bucket, without a trailing slash. */
export function mediaBaseUrl(): string {
	const set = (process.env.NEXT_PUBLIC_MEDIA_URL || "").replace(/\/+$/, "");
	if (set) return set;
	return `https://${aws.bucket()}.s3.${aws.region()}.amazonaws.com`;
}

let s3: S3Client | null = null;
export function s3Client(): S3Client {
	s3 ??= new S3Client({
		region: aws.region(),
		endpoint: process.env.S3_ENDPOINT || undefined,
		credentials: { accessKeyId: aws.accessKeyId(), secretAccessKey: aws.secretAccessKey() },
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
