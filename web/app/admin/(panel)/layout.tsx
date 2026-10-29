import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "../auth-actions";
import { AdminNav } from "./AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
	const user = await requireUser();
	const [{ unread }] = await db()<{ unread: string }[]>`select count(*) as unread from submissions where read_at is null`;

	return (
		<div className="adm-shell">
			<a className="skip-link" href="#adm-main">
				Skip to content
			</a>
			<aside className="adm-side">
				<Link href="/admin/" className="adm-side__brand">
					Stephen Legal <span>Admin</span>
				</Link>
				<AdminNav isAdmin={user.role === "admin"} unread={Number(unread)} />
				<div className="adm-side__user">
					<p>
						<strong>{user.name}</strong>
						<span>{user.role === "admin" ? "Administrator" : "Editor"}</span>
					</p>
					<Link href="/admin/account/">Account</Link>
					<form action={signOut}>
						<button type="submit" className="adm-link">
							Sign out
						</button>
					</form>
				</div>
			</aside>
			<div className="adm-main" id="adm-main" tabIndex={-1}>
				{children}
			</div>
		</div>
	);
}
