"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useIsClient } from "@/lib/client";
import { removeSaved, useSaved } from "@/lib/saved";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function SavedList() {
	const saved = useSaved();
	const reduce = useReducedMotion();
	// Saved items live in this browser; render after hydration so server and client markup agree.
	const isClient = useIsClient();
	if (!isClient) return null;

	if (!saved.length) {
		return (
			<p className="empty">
				Nothing saved yet. Use the <strong>Save</strong> button under any article to keep it here. Saved articles stay in this browser only.
			</p>
		);
	}

	return (
		<>
			<p className="meta" role="status">
				{saved.length} saved {saved.length === 1 ? "article" : "articles"} · stored in this browser only
			</p>
			<ul className="saved-list">
				<AnimatePresence initial={false}>
					{saved.map((a) => (
						<motion.li
							key={a.href}
							className="saved-item"
							layout={!reduce}
							exit={{ opacity: 0, x: reduce ? 0 : -40, transition: { duration: 0.25 } }}
						>
							<div>
								{a.category && <span className="kicker">{a.category}</span>}
								<p className="saved-item__title">
									<Link href={a.href}>{a.title}</Link>
								</p>
								<p className="meta">
									<time dateTime={a.date}>{DATE.format(new Date(a.date))}</time>
								</p>
							</div>
							<button type="button" className="saved-item__remove" onClick={() => removeSaved(a.href)}>
								Remove<span className="screen-reader-text"> {a.title}</span>
							</button>
						</motion.li>
					))}
				</AnimatePresence>
			</ul>
		</>
	);
}
