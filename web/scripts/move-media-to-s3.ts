/**
 * Moves uploaded media from Vercel Blob to the S3 media bucket (lib/storage.ts), keeping
 * every file's path ("uploads/2026/09/photo.jpg"), so only the address in front changes.
 *
 *   npm run media:to-s3                  report only: what would be copied and changed
 *   npm run media:to-s3 -- --setup-bucket   create the bucket (if missing) and make uploads/ public
 *   npm run media:to-s3 -- --apply          copy the files, check each one loads, then update the links
 *
 * Needs S3_* and DATABASE_URL in .env.local. Files on Vercel Blob are left in place
 * (the way back) until the move has been checked.
 */
import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, PutPublicAccessBlockCommand } from "@aws-sdk/client-s3";
import { mediaBaseUrl, putS3Object, s3Client, s3Configured } from "../lib/storage.ts";
import { connect } from "./_db.ts";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const SETUP = args.has("--setup-bucket");
const BLOB = /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com/;
/** The same address anywhere in a text (article HTML, settings), not only at the start. */
const BLOB_ANYWHERE = "https://[^/]+\\.public\\.blob\\.vercel-storage\\.com/";

if (!s3Configured()) {
	console.error("Set S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_MEDIA_BUCKET in .env.local first.");
	process.exit(1);
}
const bucket = process.env.S3_MEDIA_BUCKET!;
const region = process.env.S3_REGION || "us-east-1";
const base = mediaBaseUrl();

if (SETUP) {
	const s3 = s3Client();
	let exists = true;
	try {
		await s3.send(new HeadBucketCommand({ Bucket: bucket }));
	} catch {
		exists = false;
	}
	if (!exists) {
		await s3.send(new CreateBucketCommand({ Bucket: bucket, ...(region !== "us-east-1" && { CreateBucketConfiguration: { LocationConstraint: region as never } }) }));
		console.log(`Created bucket ${bucket} in ${region}.`);
	} else console.log(`Bucket ${bucket} already exists.`);
	// Public read for website media only (uploads/), as the lexpraxis media bucket; nothing else is public.
	await s3.send(new PutPublicAccessBlockCommand({ Bucket: bucket, PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: false, RestrictPublicBuckets: false } }));
	await s3.send(
		new PutBucketPolicyCommand({
			Bucket: bucket,
			Policy: JSON.stringify({
				Version: "2012-10-17",
				Statement: [{ Sid: "PublicReadWebsiteMedia", Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: `arn:aws:s3:::${bucket}/uploads/*` }],
			}),
		}),
	);
	console.log(`uploads/ in ${bucket} is publicly readable at ${base}/uploads/…`);
	process.exit(0);
}

const sql = connect();
const rows = await sql<{ id: number; url: string; mime: string }[]>`select id, url, mime from media where url ~ ${BLOB.source} order by id`;
const origins = [...new Set(rows.map((r) => r.url.match(BLOB)![0]))];
const [{ posts }] = await sql<{ posts: number }[]>`select count(*)::int as posts from posts where content ~ ${BLOB_ANYWHERE} or excerpt ~ ${BLOB_ANYWHERE}`;
const [{ authors }] = await sql<{ authors: number }[]>`select count(*)::int as authors from authors where avatar_url ~ ${BLOB_ANYWHERE}`;
const [{ settings }] = await sql<{ settings: number }[]>`select count(*)::int as settings from settings where value::text ~ ${BLOB_ANYWHERE}`;
// Links in articles to Blob hosts that no media row names would be missed by the switch below.
const strays = await sql<{ host: string }[]>`select distinct substring(content from ${"(https://[^/]+\\.public\\.blob\\.vercel-storage\\.com)/"}) as host from posts where content ~ ${BLOB_ANYWHERE}`;
const unknown = strays.map((s) => s.host).filter((h) => h && !origins.includes(h));
console.log(`Vercel Blob (${origins.join(", ")}) → ${base}`);
console.log(`${rows.length} files to copy; links to change in ${posts} articles/pages, ${authors} authors, ${settings} settings.`);
if (unknown.length) console.log(`Warning: articles also link to other Blob stores not in the media library: ${unknown.join(", ")}`);
if (!APPLY) {
	console.log("Report only. Run with --apply to copy and switch.");
	await sql.end();
	process.exit(0);
}

// 1. Copy every file, then check it loads from its new public address.
let copied = 0;
const failed: string[] = [];
let next = 0;
async function worker() {
	while (next < rows.length) {
		const r = rows[next++];
		const objectKey = new URL(r.url).pathname.replace(/^\/+/, "");
		let lastError = "";
		// Downloads sometimes drop mid-transfer; each file gets a few tries.
		for (let attempt = 1; attempt <= 4; attempt++) {
			try {
				const res = await fetch(r.url);
				if (!res.ok) throw new Error(`download HTTP ${res.status}`);
				const body = Buffer.from(await res.arrayBuffer());
				const url = await putS3Object(objectKey, body, res.headers.get("content-type")?.split(";")[0] || r.mime);
				const check = await fetch(url, { method: "HEAD" });
				if (!check.ok) throw new Error(`new address HTTP ${check.status}`);
				lastError = "";
				break;
			} catch (e) {
				lastError = (e as Error).message;
				await new Promise((s) => setTimeout(s, 2000 * attempt));
			}
		}
		if (lastError) failed.push(`${r.url}: ${lastError}`);
		else if (++copied % 50 === 0) console.log(`  ${copied} / ${rows.length} copied…`);
	}
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`${copied} files copied and checked.`);
if (failed.length) {
	console.error(`${failed.length} failed; nothing in the database was changed:\n${failed.join("\n")}`);
	await sql.end();
	process.exit(1);
}

// 2. Point every link at the bucket, all at once.
await sql.begin(async (tx) => {
	for (const o of origins) {
		await tx`update media set url = replace(url, ${o}, ${base}) where url like ${`${o}/%`}`;
		await tx`update posts set content = replace(content, ${o}, ${base}), excerpt = replace(excerpt, ${o}, ${base}) where content like ${`%${o}/%`} or excerpt like ${`%${o}/%`}`;
		await tx`update authors set avatar_url = replace(avatar_url, ${o}, ${base}) where avatar_url like ${`${o}/%`}`;
		await tx`update settings set value = replace(value::text, ${o}, ${base})::jsonb where value::text like ${`%${o}/%`}`;
	}
});
const [{ left }] = await sql<{ left: number }[]>`select count(*)::int as left from media where url ~ ${BLOB.source}`;
console.log(`Links updated. Files still pointing at Vercel Blob: ${left}. Pages refresh within 5 minutes (or on the next save in the admin).`);
await sql.end();
