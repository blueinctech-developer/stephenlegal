import type { Metadata } from "next";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { renderPage, T } from "@/lib/legacy/render";
import { SITE_URL } from "@/lib/config";

export const revalidate = 300;

export const metadata: Metadata = {
	title: { absolute: "Home - Stephen Legal" },
	alternates: { canonical: `${SITE_URL}/` },
	openGraph: { type: "website", title: "Home - Stephen Legal", url: `${SITE_URL}/` },
};

export default async function HomePage() {
	return <LegacyPage html={await renderPage(T.home.main)} bodyClass={T.home.bodyClass} />;
}
