import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Image as WpImage, PostSummary } from "@/lib/wp";
import { formatDate } from "@/lib/text";

/** 16:9 frame (no layout shift) with the featured image, or a neutral placeholder. */
export function Media({ image, sizes, preload, className = "" }: { image: WpImage | null; sizes: string; preload?: boolean; className?: string }) {
	return (
		<div className={`media ${className}`.trim()}>
			{image ? (
				// The headline beside the image already names the story; the image is decorative in a card.
				<Image src={image.url} alt="" fill sizes={sizes} preload={preload} fetchPriority={preload ? "high" : undefined} />
			) : (
				<span className="media__placeholder" aria-hidden="true" />
			)}
		</div>
	);
}

export function Kicker({ post, link = true }: { post: Pick<PostSummary, "category">; link?: boolean }) {
	if (!post.category) return null;
	return link ? (
		<Link className="kicker" href={`/category/${post.category.slug}/`}>
			{post.category.name}
		</Link>
	) : (
		<span className="kicker">{post.category.name}</span>
	);
}

export function Meta({ post, author = false, minutes = false }: { post: PostSummary; author?: boolean; minutes?: boolean }) {
	return (
		<p className="meta">
			{author && (
				<>
					<span className="meta__author">{post.author}</span>
					<span className="meta__sep" aria-hidden="true">·</span>
				</>
			)}
			<time dateTime={post.date}>{formatDate(post.date)}</time>
			{minutes && post.minutes > 0 && (
				<>
					<span className="meta__sep" aria-hidden="true">·</span>
					<span>{post.minutes} min read</span>
				</>
			)}
		</p>
	);
}

/** Headline split into words for the entrance animation; screen readers get the plain title. */
export function SplitTitle({ text }: { text: string }) {
	const words = text.split(/\s+/);
	return (
		<span className="split">
			<span className="screen-reader-text">{text}</span>
			<span aria-hidden="true">
				{words.map((w, i) => (
					<span key={i}>
						<span className="w" style={{ "--i": i } as CSSProperties}>
							{w}
						</span>{" "}
					</span>
				))}
			</span>
		</span>
	);
}

export type CardVariant = "lead" | "rail" | "feature" | "standard" | "compact" | "row" | "headline";

type CardProps = {
	post: PostSummary;
	variant?: CardVariant;
	as?: "h2" | "h3" | "h4";
	sizes?: string;
	preload?: boolean;
	/** Scroll-reveal stagger index; omit to disable the reveal. */
	reveal?: number;
	showKicker?: boolean;
};

export function Card({ post, variant = "standard", as: H = "h3", sizes = "(min-width: 1024px) 33vw, 100vw", preload, reveal, showKicker = true }: CardProps) {
	const withImage = variant !== "headline" && variant !== "row";
	const withExcerpt = (variant === "lead" || variant === "feature") && post.excerpt;
	return (
		<article
			className={`card card--${variant}${reveal !== undefined ? " reveal" : ""}`}
			style={reveal !== undefined ? ({ "--i": reveal % 4 } as CSSProperties) : undefined}
		>
			{withImage && <Media image={post.image} sizes={sizes} preload={preload} />}
			<div className="card__body">
				{showKicker && <Kicker post={post} />}
				<H className="card__title">
					<Link href={post.href}>{variant === "lead" ? <SplitTitle text={post.title} /> : post.title}</Link>
				</H>
				{withExcerpt && <p className="card__dek">{post.excerpt}</p>}
				<Meta post={post} author={variant === "lead"} />
			</div>
		</article>
	);
}

export function SectionHead({ title, id, link, label = "See all" }: { title: string; id?: string; link?: string; label?: string }) {
	return (
		<div className="section-head reveal">
			<h2 className="section-head__title" id={id}>
				{title}
			</h2>
			{link && (
				<Link className="section-head__link" href={link}>
					{label}
					<span aria-hidden="true">→</span>
				</Link>
			)}
		</div>
	);
}
