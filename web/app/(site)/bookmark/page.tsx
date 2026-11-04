import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { renderStaticPage } from "@/lib/legacy/pages";

export const metadata: Metadata = { title: { absolute: "Bookmark - Stephen Legal" }, robots: { index: false, follow: true } };

/** Articles saved with the bookmark buttons, kept in this browser (filled in by public/legacy/site.js). */
export default async function BookmarkPage() {
	const html = await renderStaticPage("bookmark", "Bookmark", '<div id="sl-bookmarks"><p>You have not bookmarked any articles yet.</p></div>');
	return <LegacyPage html={html} bodyClass="page-template-default page wp-theme-forcast ori-inner-page elementor-default elementor-kit-7" />;
}
