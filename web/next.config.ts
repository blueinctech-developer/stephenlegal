import type { NextConfig } from "next";

const WP_URL = (process.env.WORDPRESS_URL || "https://stephenlegal.ng").replace(/\/+$/, "");
const wpHost = new URL(WP_URL).hostname;

const securityHeaders = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-Frame-Options", value: "SAMEORIGIN" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
	{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
	// WordPress permalinks end in a slash; keep every URL identical.
	trailingSlash: true,
	poweredByHeader: false,
	// Few build workers so prerendering doesn't overload the WordPress host.
	experimental: { cpus: 2, staticGenerationRetryCount: 2 },
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: wpHost, pathname: "/wp-content/uploads/**" },
			{ protocol: "https", hostname: "stephenlegal.ng", pathname: "/wp-content/uploads/**" },
			{ protocol: "https", hostname: "secure.gravatar.com" },
		],
		formats: ["image/avif", "image/webp"],
	},
	async headers() {
		return [{ source: "/:path*", headers: securityHeaders }];
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
			// Editors keep using WordPress admin wherever WordPress is hosted.
			...(wpHost === "stephenlegal.ng"
				? []
				: [
						{ source: "/wp-admin/:path*", destination: `${WP_URL}/wp-admin/:path*`, permanent: false },
						{ source: "/wp-login.php", destination: `${WP_URL}/wp-login.php`, permanent: false },
					]),
		];
	},
	async rewrites() {
		// Once WordPress moves to its own host, keep old upload URLs (linked from articles and other sites) working.
		if (wpHost === "stephenlegal.ng") return [];
		return [{ source: "/wp-content/uploads/:path*", destination: `${WP_URL}/wp-content/uploads/:path*` }];
	},
};

export default nextConfig;
