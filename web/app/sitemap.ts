import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { getAllPostEntries, getCategories } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [posts, categories] = await Promise.all([getAllPostEntries(), getCategories()]);
	const pages = ["/", "/blog/", "/contact/", "/become-a-contributor/", "/privacy-policy/"];
	return [
		...pages.map((p) => ({ url: `${SITE_URL}${p}` })),
		...categories.filter((c) => (c.count ?? 0) > 0).map((c) => ({ url: `${SITE_URL}/category/${c.slug}/` })),
		...posts.map((p) => ({ url: `${SITE_URL}${p.href}`, lastModified: p.modified })),
	];
}
