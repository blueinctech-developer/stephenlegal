import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/config";

// Styles live with each part: the public site loads the original theme's
// stylesheets (app/(site)/layout.tsx), the admin its own (app/admin/layout.tsx).
export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s` },
	description: SITE_TAGLINE,
	applicationName: SITE_NAME,
	openGraph: { siteName: SITE_NAME, locale: "en_US", type: "website" },
	twitter: { card: "summary_large_image", site: "@stephen_legal" },
	alternates: { types: { "application/rss+xml": `${SITE_URL}/feed/` } },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en-US">
			<body suppressHydrationWarning>{children}</body>
		</html>
	);
}
