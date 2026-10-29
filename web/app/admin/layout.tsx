import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: { absolute: "Admin - Stephen Legal" }, robots: { index: false, follow: false } };

// Every admin screen shows live data for the signed-in user.
export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
	return <div className="admin">{children}</div>;
}
