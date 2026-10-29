import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
	// Preview addresses (e.g. *.vercel.app) are never crawled.
	if (new URL(SITE_URL).hostname !== "stephenlegal.ng") return { rules: [{ userAgent: "*", disallow: "/" }] };
	return {
		rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/search/", "/bookmark/"] }],
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
