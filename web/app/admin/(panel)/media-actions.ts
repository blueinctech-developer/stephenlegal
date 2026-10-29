"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { toSlug } from "@/lib/admin-format";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile, putFile } from "@/lib/storage";

export type MediaItem = { id: number; url: string; alt: string; caption: string; width: number | null; height: number | null; mime: string; created: string };
export type UploadResult = { ok: true; item: MediaItem } | { ok: false; error: string };

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "application/pdf": "pdf" };
// Images wider than this are scaled down on upload; nothing on the site shows them larger.
const MAX_WIDTH = 2400;

export async function uploadMedia(form: FormData): Promise<UploadResult> {
	await requireUser();
	const file = form.get("file");
	if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload." };
	if (file.size > MAX_BYTES) return { ok: false, error: "That file is larger than 10 MB." };
	const ext = TYPES[file.type];
	if (!ext) return { ok: false, error: "Upload a JPEG, PNG, WebP, GIF, AVIF image or a PDF." };

	let body: Buffer = Buffer.from(await file.arrayBuffer());
	let width: number | null = null;
	let height: number | null = null;
	if (file.type.startsWith("image/")) {
		try {
			const image = sharp(body, { animated: file.type === "image/gif" });
			const meta = await image.metadata();
			if (file.type !== "image/gif" && (meta.width ?? 0) > MAX_WIDTH) {
				body = await image.rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).toBuffer();
			} else if (file.type === "image/jpeg") {
				// Apply the camera's orientation so photos aren't shown sideways.
				body = await image.rotate().toBuffer();
			}
			const final = await sharp(body).metadata();
			width = final.width ?? null;
			height = final.pageHeight ?? final.height ?? null;
		} catch {
			return { ok: false, error: "That image couldn’t be read. Try saving it again as JPEG or PNG." };
		}
	}

	const now = new Date();
	const base = toSlug(file.name.replace(/\.[^.]+$/, "")).slice(0, 60) || "file";
	const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${base}-${randomBytes(3).toString("hex")}.${ext}`;
	const stored = await putFile(key, body, file.type);
	const alt = String(form.get("alt") ?? "").trim().slice(0, 300);

	const [row] = await db()<MediaRow[]>`
		insert into media (url, storage_key, mime, width, height, size_bytes, alt)
		values (${stored.url}, ${stored.key}, ${file.type}, ${width}, ${height}, ${body.length}, ${alt})
		returning id, url, alt, caption, width, height, mime, created_at`;
	revalidatePath("/admin/media/");
	return { ok: true, item: toItem(row) };
}

type MediaRow = { id: number; url: string; alt: string; caption: string; width: number | null; height: number | null; mime: string; created_at: Date };
const toItem = (r: MediaRow): MediaItem => ({ id: r.id, url: r.url, alt: r.alt, caption: r.caption, width: r.width, height: r.height, mime: r.mime, created: r.created_at.toISOString() });

export async function updateMedia(form: FormData): Promise<{ ok: boolean; error?: string }> {
	await requireUser();
	const id = Number(form.get("id"));
	const alt = String(form.get("alt") ?? "").trim().slice(0, 300);
	const caption = String(form.get("caption") ?? "").trim().slice(0, 500);
	await db()`update media set alt = ${alt}, caption = ${caption} where id = ${id}`;
	revalidatePath("/", "layout");
	return { ok: true };
}

/** Deletes a file only when no article or page uses it. */
export async function deleteMedia(form: FormData): Promise<{ ok: boolean; error?: string }> {
	await requireUser();
	const id = Number(form.get("id"));
	const sql = db();
	const [m] = await sql<{ url: string; storage_key: string }[]>`select url, storage_key from media where id = ${id}`;
	if (!m) return { ok: false, error: "That file no longer exists." };
	const used = await sql<{ title: string }[]>`
		select title from posts where featured_media_id = ${id} or strpos(content, ${m.url}) > 0 limit 3`;
	if (used.length) {
		return { ok: false, error: `Still used by: ${used.map((u) => `“${u.title}”`).join(", ")}${used.length === 3 ? " and others" : ""}. Remove it there first.` };
	}
	await deleteFile(m.storage_key, m.url);
	await sql`delete from media where id = ${id}`;
	revalidatePath("/admin/media/");
	return { ok: true };
}
