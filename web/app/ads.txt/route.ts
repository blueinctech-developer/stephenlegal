import { getSettings } from "@/lib/settings";

export const revalidate = 300;

/** The advertising networks allowed to sell space on this site (Admin → Settings → Ads). Empty means no file. */
export async function GET() {
	const { ads } = await getSettings();
	const body = ads.adsTxt.trim();
	if (!body) return new Response("Not found", { status: 404 });
	return new Response(`${body}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
