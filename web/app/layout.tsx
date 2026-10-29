import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Space_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Ticker } from "@/components/Ticker";
import { PLACEMENT_CATEGORIES, PUBLICATION_LINKS, SITE_NAME, SITE_URL } from "@/lib/config";
import { getPosts, getSiteInfo, getTopics, optional } from "@/lib/wp";
import "./globals.css";
import "./motion.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space-grotesk", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-source-serif", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
	const info = await getSiteInfo();
	return {
		metadataBase: new URL(SITE_URL),
		title: { default: `${SITE_NAME} — ${info.description || "Legal news and analysis"}`, template: `%s` },
		description: info.description || undefined,
		applicationName: SITE_NAME,
		openGraph: { siteName: SITE_NAME, locale: "en_US", type: "website" },
		twitter: { card: "summary_large_image", site: "@stephen_legal" },
		alternates: { types: { "application/rss+xml": `${SITE_URL}/feed/` } },
	};
}

export const viewport: Viewport = { themeColor: "#17191F", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	// Navigation and the ticker are supporting content: a WordPress hiccup must not take every page down.
	const [info, topics, latest] = await Promise.all([getSiteInfo(), optional(getTopics(18, 1), []), optional(getPosts({ perPage: 10 }), { items: [] })]);
	const nav = topics.filter((t) => !PLACEMENT_CATEGORIES.includes(t.slug) || t.slug === "trending").slice(0, 7);
	const footerTopics = topics.filter((t) => (t.count ?? 0) >= 5).slice(0, 10);

	return (
		<html lang="en-GB" className={`${spaceGrotesk.variable} ${sourceSerif.variable}`}>
			<body>
				<a className="skip-link" href="#main">
					Skip to content
				</a>
				<SiteHeader
					nav={nav.map(({ name, slug }) => ({ name, slug }))}
					topics={topics.map(({ name, slug, count }) => ({ name, slug, count }))}
					links={PUBLICATION_LINKS}
					tagline={info.description}
				/>
				<Ticker items={latest.items.map((p) => ({ title: p.title, href: p.href }))} />
				{children}
				<SiteFooter topics={footerTopics} />
			</body>
		</html>
	);
}
