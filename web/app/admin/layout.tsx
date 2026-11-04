import type { Metadata } from "next";
import { Source_Serif_4, Space_Grotesk } from "next/font/google";
import "../globals.css";
import "./admin.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-space-grotesk", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-source-serif", display: "swap" });

export const metadata: Metadata = { title: { absolute: "Admin - Stephen Legal" }, robots: { index: false, follow: false } };

// Every admin screen shows live data for the signed-in user.
export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
	return <div className={`admin ${spaceGrotesk.variable} ${sourceSerif.variable}`}>{children}</div>;
}
