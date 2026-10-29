import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Ticker } from "@/components/Ticker";
import { PLACEMENT_CATEGORIES, PUBLICATION_LINKS, SITE_TAGLINE } from "@/lib/config";
import { getPosts, getTopics, optional } from "@/lib/data";

/** Header, latest-headlines ticker and footer around every public page. */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
	// Navigation and the ticker are supporting content: a database hiccup must not take every page down.
	const [topics, latest] = await Promise.all([optional(getTopics(18, 1), []), optional(getPosts({ perPage: 10 }), { items: [] })]);
	const nav = topics.filter((t) => !PLACEMENT_CATEGORIES.includes(t.slug) || t.slug === "trending").slice(0, 7);
	const footerTopics = topics.filter((t) => (t.count ?? 0) >= 5).slice(0, 10);

	return (
		<>
			<a className="skip-link" href="#main">
				Skip to content
			</a>
			<SiteHeader
				nav={nav.map(({ name, slug }) => ({ name, slug }))}
				topics={topics.map(({ name, slug, count }) => ({ name, slug, count }))}
				links={PUBLICATION_LINKS}
				tagline={SITE_TAGLINE}
			/>
			<Ticker items={latest.items.map((p) => ({ title: p.title, href: p.href }))} />
			{children}
			<SiteFooter topics={footerTopics} />
		</>
	);
}
