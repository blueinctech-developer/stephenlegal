"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import type { PostSummary } from "@/lib/data";
import { Card } from "./Card";

const SHOWN = 5;

/**
 * "Latest analysis" with topic chips. Filtering happens in the browser over the
 * most recent stories, with cards re-flowing into place.
 */
export function TopicFilter({ posts }: { posts: PostSummary[] }) {
	const reduce = useReducedMotion();
	const [topic, setTopic] = useState<string | null>(null);

	// The five topics that appear most among recent stories.
	const topics = useMemo(() => {
		const counts = new Map<string, { name: string; slug: string; n: number }>();
		for (const p of posts) {
			if (!p.category) continue;
			const entry = counts.get(p.category.slug) ?? { name: p.category.name, slug: p.category.slug, n: 0 };
			entry.n++;
			counts.set(p.category.slug, entry);
		}
		return [...counts.values()].filter((t) => t.n >= 2).sort((a, b) => b.n - a.n).slice(0, 5);
	}, [posts]);

	const filtered = topic ? posts.filter((p) => p.category?.slug === topic) : posts;
	const shown = filtered.slice(0, SHOWN);
	const current = topics.find((t) => t.slug === topic);
	const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 34 };

	return (
		<>
			<LayoutGroup id="topic-chips">
				<div className="chips" role="group" aria-label="Filter latest stories by topic">
					{[{ name: "All", slug: null as string | null, n: posts.length }, ...topics].map((t) => {
						const pressed = topic === t.slug;
						return (
							<button key={t.slug ?? "all"} type="button" className="chip" aria-pressed={pressed} onClick={() => setTopic(t.slug)}>
								{pressed && <motion.span className="chip__bg" layoutId="chip-bg" transition={spring} aria-hidden="true" />}
								{t.name}
								{t.slug && <span className="chip__count">{t.n}</span>}
							</button>
						);
					})}
				</div>
			</LayoutGroup>
			<p className="filter-status" role="status">
				{current ? `Showing the latest ${current.name} stories.` : ""}
			</p>

			<div className="mosaic">
				<AnimatePresence mode="popLayout" initial={false}>
					{shown.map((post, i) => (
						<motion.div
							key={post.id}
							className={i === 0 ? "mosaic__feature" : "mosaic__item"}
							layout={!reduce}
							initial={{ opacity: 0, y: reduce ? 0 : 24 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
							transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.2, 0.7, 0.2, 1], delay: i * 0.04 }}
						>
							<Card
								post={post}
								variant={i === 0 ? "feature" : "standard"}
								sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
							/>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
			{current && (
				<p className="more">
					<Link className="btn" href={`/category/${current.slug}/`}>
						All {current.name} stories <span aria-hidden="true">→</span>
					</Link>
				</p>
			)}
		</>
	);
}
