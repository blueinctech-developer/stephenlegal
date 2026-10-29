"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
	{ href: "/admin/", label: "Dashboard", exact: true },
	{ href: "/admin/posts/", label: "Articles" },
	{ href: "/admin/pages/", label: "Pages" },
	{ href: "/admin/media/", label: "Media" },
	{ href: "/admin/topics/", label: "Categories & tags" },
	{ href: "/admin/authors/", label: "Authors" },
	{ href: "/admin/messages/", label: "Messages" },
];

export function AdminNav({ isAdmin, unread }: { isAdmin: boolean; unread: number }) {
	const path = usePathname();
	const items = isAdmin ? [...ITEMS, { href: "/admin/users/", label: "Users" }] : ITEMS;
	return (
		<nav aria-label="Admin">
			<ul className="adm-nav">
				{items.map((item) => {
					const current = "exact" in item ? path === item.href : path.startsWith(item.href);
					return (
						<li key={item.href}>
							<Link href={item.href} aria-current={current ? "page" : undefined}>
								{item.label}
								{item.href === "/admin/messages/" && unread > 0 && (
									<span className="adm-badge">
										{unread}
										<span className="screen-reader-text"> unread</span>
									</span>
								)}
							</Link>
						</li>
					);
				})}
				<li>
					<a href="/" target="_blank" rel="noopener">
						View site <span aria-hidden="true">↗</span>
						<span className="screen-reader-text"> (opens in a new tab)</span>
					</a>
				</li>
			</ul>
		</nav>
	);
}
