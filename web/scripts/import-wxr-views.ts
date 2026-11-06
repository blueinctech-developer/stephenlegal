/**
 * Copies article view counts from a WordPress export file (Tools → Export → All
 * content), where the theme kept them as `_empath_views_count`. Articles are matched
 * by address (slug). A count is only ever raised, so running it again, or after new
 * reads have been counted, is safe.
 *
 *   node --env-file=.env.local scripts/import-wxr-views.ts --file=<export.xml>
 */
import { readFileSync } from "node:fs";
import { connect } from "./_db.ts";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
if (!args.file) throw new Error("Pass --file=<WordPress export .xml>");

const xml = readFileSync(args.file, "utf8");
const field = (item: string, tag: string) => {
	const open = item.indexOf(`<${tag}>`);
	if (open < 0) return "";
	const value = item.slice(open + tag.length + 2, item.indexOf(`</${tag}>`, open));
	return value.replace(/^<!\[CDATA\[|\]\]>$/g, "");
};
const meta = (item: string, key: string) => {
	const at = item.indexOf(`<wp:meta_key><![CDATA[${key}]]></wp:meta_key>`);
	if (at < 0) return "";
	return field(item.slice(at), "wp:meta_value");
};

const counts = new Map<string, number>();
for (const item of xml.split("<item>").slice(1)) {
	if (field(item, "wp:post_type") !== "post") continue;
	const views = Number(meta(item, "_empath_views_count")) || 0;
	const slug = decodeURIComponent(field(item, "wp:post_name"));
	if (slug && views > 0) counts.set(slug, Math.max(views, counts.get(slug) ?? 0));
}

const sql = connect();
let updated = 0;
let missing = 0;
for (const [slug, views] of counts) {
	const rows = await sql`update posts set views = greatest(views, ${views}) where type = 'post' and slug = ${slug} returning id`;
	if (rows.length) updated++;
	else missing++;
}
const [{ total }] = await sql<{ total: string }[]>`select coalesce(sum(views), 0) as total from posts where type = 'post'`;
console.log(`${counts.size} articles with views in the export; ${updated} matched, ${missing} not found here. Total views now ${Number(total).toLocaleString("en-GB")}.`);
await sql.end();
