import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Space_Grotesk } from "next/font/google";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/config";
import "./globals.css";
import "./motion.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space-grotesk", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-source-serif", display: "swap" });

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s` },
	description: SITE_TAGLINE,
	applicationName: SITE_NAME,
	openGraph: { siteName: SITE_NAME, locale: "en_US", type: "website" },
	twitter: { card: "summary_large_image", site: "@stephen_legal" },
	alternates: { types: { "application/rss+xml": `${SITE_URL}/feed/` } },
};

export const viewport: Viewport = { themeColor: "#17191F", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en-GB" className={`${spaceGrotesk.variable} ${sourceSerif.variable}`}>
			<body>{children}</body>
		</html>
	);
}
