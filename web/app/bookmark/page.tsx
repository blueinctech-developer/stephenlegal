import type { Metadata } from "next";
import { SavedList } from "@/components/SavedList";

export const metadata: Metadata = { title: { absolute: "Saved articles - Stephen Legal" }, robots: { index: false, follow: true } };

/** Replaces the old theme's /bookmark/ page: articles saved in this browser. */
export default function BookmarkPage() {
	return (
		<main id="main" className="wrap page" tabIndex={-1}>
			<header className="page-header">
				<h1 className="page-header__title">Saved articles</h1>
			</header>
			<div className="page-content">
				<SavedList />
			</div>
		</main>
	);
}
