import type { NextConfig } from "next";

// Only the real domain is indexed; previews and test copies stay out of search results.
const IS_PUBLIC_SITE = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://stephenlegal.ng").hostname === "stephenlegal.ng";

const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-Frame-Options", value: "SAMEORIGIN" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
	{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
	// The old WordPress permalinks end in a slash; keep every URL identical.
	trailingSlash: true,
	poweredByHeader: false,
	experimental: {
		// Admin uploads (files up to 10 MB) go through server actions.
		serverActions: { bodySizeLimit: "12mb" },
	},
	images: {
		remotePatterns: [
			// Uploaded files in production (Vercel Blob).
			{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
			// Only used if the import was run with --media=link.
			{ protocol: "https", hostname: "stephenlegal.ng", pathname: "/wp-content/uploads/**" },
			{ protocol: "https", hostname: "secure.gravatar.com" },
		],
		formats: ["image/avif", "image/webp"],
	},
	async headers() {
		const headers = IS_PUBLIC_SITE ? securityHeaders : [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }];
		return [{ source: "/:path*", headers }];
	},
	async redirects() {
		return [
			// WordPress search URLs.
			{ source: "/", has: [{ type: "query", key: "s", value: "(?<q>.*)" }], destination: "/search/?q=:q", permanent: true },
			// Blog index pagination lives under the existing /blog/ page.
			{ source: "/page/:n(\\d+)/", destination: "/blog/page/:n/", permanent: true },
			// Yoast sitemaps → the single Next.js sitemap.
			{ source: "/sitemap_index.xml", destination: "/sitemap.xml", permanent: true },
			{ source: "/:name(post|page|category|post_tag|author)-sitemap:n(\\d*).xml", destination: "/sitemap.xml", permanent: true },
			// Old theme account pages have no equivalent on the new site.
			{ source: "/:slug(login|register|edit-profile|password-reset)/", destination: "/", permanent: false },
			// Old WordPress sign-in addresses lead to the new admin.
			{ source: "/wp-admin/:path*", destination: "/admin/", permanent: false },
			{ source: "/wp-login.php", destination: "/admin/login/", permanent: false },
		];
	},
};

export default nextConfig;
