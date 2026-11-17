"use client";

import { useEffect, useRef, useState } from "react";
import { highlightInEditor } from "./analysisHighlight";

/**
 * Live SEO and readability analysis while writing, using Yoast's own analysis engine
 * (the open-source `yoastseo` package, the same checks as the Yoast plugin on the old
 * WordPress site). It reads the surrounding editor form every couple of seconds, so it
 * follows the title, web address, search title and description, focus keyphrase, featured
 * image and article text as they change. Advice only: it never blocks saving or publishing.
 */

type Rating = "good" | "ok" | "bad" | "na";
type Item = { id: string; rating: Rating; html: string; marks: string[] };
type Result = { seo: { score: number; items: Item[] } | null; read: { score: number; items: Item[] } };

const LABEL: Record<Rating, string> = { good: "Good", ok: "OK", bad: "Needs improvement", na: "Not analysed" };

/** Yoast's thresholds: per check 8–10 good, 5–7 ok, 1–4 bad; overall above 70 good, above 40 ok. */
const itemRating = (score: number): Rating => (score > 7 ? "good" : score > 4 ? "ok" : score > 0 ? "bad" : "na");
const overallRating = (score: number): Rating => (score > 70 ? "good" : score > 40 ? "ok" : "bad");
const ORDER: Record<Rating, number> = { bad: 0, ok: 1, good: 2, na: 3 };

const SITE = "https://stephenlegal.ng";
const TITLE_SUFFIX = " - Stephen Legal";

type Snapshot = { html: string; featured: { url: string; alt: string } | null; keyword: string; title: string; seoTitle: string; description: string; excerpt: string; slug: string };

function read(form: HTMLFormElement): Snapshot {
	const fd = new FormData(form);
	const v = (k: string) => String(fd.get(k) ?? "");
	const fi = form.querySelector<HTMLInputElement>("input[name=featured_media_id]");
	const featured = fi?.value && fi.dataset.url ? { url: fi.dataset.url, alt: fi.dataset.alt ?? "" } : null;
	return { html: v("content"), featured, keyword: v("focus_keyphrase").trim(), title: v("title"), seoTitle: v("seo_title"), description: v("seo_description"), excerpt: v("excerpt"), slug: v("slug") };
}

type YoastMark = { getOriginal(): string; getPosition?(): { startOffset: number; endOffset: number } | undefined };
type YoastResult = { getScore(): number; getText(): string; getIdentifier(): string; hasMarks(): boolean; getMarker(): () => void };
type Assessor = { assess: (p: unknown) => void; getValidResults: () => YoastResult[]; calculateOverallScore: () => number };

async function analyse(s: Snapshot): Promise<Result> {
	const [{ Paper, assessors }, researcherMod] = await Promise.all([import("yoastseo"), import("yoastseo/build/languageProcessing/languages/en/Researcher")]);
	const Researcher = (researcherMod as { default: new (p: unknown) => unknown }).default;
	const title = (s.seoTitle || `${s.title}${TITLE_SUFFIX}`).trim();
	// As Yoast does on WordPress, the featured image counts towards the image checks.
	const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
	const html = s.featured ? `${s.html}<img src="${esc(s.featured.url)}" alt="${esc(s.featured.alt)}">` : s.html;
	const paper = new Paper(html, {
		keyword: s.keyword,
		title,
		titleWidth: measure(title),
		description: s.description || s.excerpt,
		slug: s.slug,
		locale: "en_US",
		permalink: `${SITE}/${s.slug}/`,
	});
	const researcher = new Researcher(paper);
	// Yoast hands each check's marks to this function; they become the eye-button highlights.
	let captured: YoastMark[] = [];
	const marker = { marker: (_paper: unknown, marks: YoastMark[]) => void (captured = marks ?? []) };
	const marksOf = (r: YoastResult): string[] => {
		if (!r.hasMarks()) return [];
		captured = [];
		try {
			r.getMarker()();
		} catch {
			return [];
		}
		const out = captured.map((m) => {
			const pos = m.getPosition?.();
			// Newer checks point at a range of the article's HTML; older ones give the sentence itself.
			const source = pos && pos.endOffset > pos.startOffset ? html.slice(pos.startOffset, pos.endOffset) : m.getOriginal();
			return plain(source);
		});
		return [...new Set(out.filter((t) => t.length > 1))];
	};
	const collect = (a: Assessor) => {
		a.assess(paper);
		const items = a
			.getValidResults()
			.filter((r) => r.getText())
			.map((r) => ({ id: r.getIdentifier(), rating: itemRating(r.getScore()), html: r.getText(), marks: marksOf(r) }))
			.sort((x, y) => ORDER[x.rating] - ORDER[y.rating]);
		return { score: a.calculateOverallScore() ?? 0, items };
	};
	const readability = collect(new assessors.ContentAssessor(researcher, marker) as Assessor);
	const seo = s.keyword ? collect(new assessors.SEOAssessor(researcher, marker) as Assessor) : null;
	return { seo, read: readability };
}

/** HTML fragment to the plain text the editor shows. */
function plain(html: string): string {
	const text = html.replace(/<[^>]*>/g, "").replace(/<[^>]*$/, "").replace(/^[^<]*>/, "");
	const t = document.createElement("textarea");
	t.innerHTML = text;
	return t.value.replace(/\s+/g, " ").trim();
}

/** Pixel width of the title as Google shows it (Arial 20px), for Yoast's title width check. */
function measure(text: string): number {
	const c = document.createElement("canvas").getContext("2d");
	if (!c) return text.length * 9;
	c.font = "20px Arial";
	return Math.round(c.measureText(text).width);
}

/** Yoast's messages are its own HTML; its links point to yoa.st articles and open in a new tab. */
const messageHtml = (html: string) => html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');

export function ContentAnalysis({ initialKeyphrase }: { initialKeyphrase: string }) {
	const box = useRef<HTMLElement>(null);
	const [keyphrase, setKeyphrase] = useState(initialKeyphrase);
	const [result, setResult] = useState<Result | null>(null);
	const [failed, setFailed] = useState(false);
	const [tab, setTab] = useState<"seo" | "read">("seo");
	// The check whose text is highlighted in the article, e.g. "seo:keyphraseDensity".
	const [shown, setShown] = useState<string | null>(null);
	const sent = useRef("");

	useEffect(() => {
		const form = box.current?.closest("form");
		if (!form) return;
		let last = "";
		let running = false;
		let cancelled = false;
		const run = async () => {
			if (running) return;
			const snap = read(form);
			const key = JSON.stringify(snap);
			if (key === last) return;
			last = key;
			running = true;
			try {
				const r = await analyse(snap);
				if (!cancelled) {
					setResult(r);
					setFailed(false);
				}
			} catch (err) {
				console.error("Content analysis failed", err);
				if (!cancelled) setFailed(true);
			} finally {
				running = false;
			}
		};
		run();
		const timer = setInterval(run, 1500);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	// Keep the highlights in step with the article as it is edited and re-analysed.
	const shownItem = shown ? (shown.startsWith("seo:") ? result?.seo : result?.read)?.items.find((i) => i.id === shown.slice(shown.indexOf(":") + 1)) : undefined;
	const needlesKey = JSON.stringify(shownItem?.marks ?? []);
	useEffect(() => {
		const form = box.current?.closest("form");
		if (!form || needlesKey === sent.current) return;
		const first = sent.current === "" || sent.current === "[]";
		sent.current = needlesKey;
		highlightInEditor(form, JSON.parse(needlesKey) as string[], first);
	}, [needlesKey]);

	const current = tab === "seo" ? result?.seo : result?.read;
	return (
		<section ref={box} className="adm-box adm-analysis" aria-labelledby="analysis-title">
			<h2 id="analysis-title">SEO &amp; readability</h2>
			<p className="adm-hint">Live analysis by Yoast&rsquo;s engine. Advice only; it never stops you publishing.</p>
			<div className="adm-field">
				<label htmlFor="focus_keyphrase">Focus keyphrase</label>
				<input id="focus_keyphrase" name="focus_keyphrase" value={keyphrase} onChange={(e) => setKeyphrase(e.target.value)} maxLength={120} placeholder="e.g. pre-election matter" aria-describedby="focus_keyphrase-hint" />
				<p className="adm-hint" id="focus_keyphrase-hint">
					The search phrase you want this article to rank for.
				</p>
			</div>
			<div className="adm-analysis__tabs" role="tablist" aria-label="Analysis">
				{(
					[
						["seo", "SEO", result?.seo ? overallRating(result.seo.score) : "na"],
						["read", "Readability", result ? overallRating(result.read.score) : "na"],
					] as const
				).map(([id, label, rating]) => (
					<button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
						<span className={`adm-dot adm-dot--${rating}`} aria-hidden="true" />
						{label}
						<span className="screen-reader-text">: {LABEL[rating]}</span>
					</button>
				))}
			</div>
			{failed ? (
				<p className="adm-hint" role="alert">
					The analysis couldn&rsquo;t run. Your article is not affected; try reloading the page.
				</p>
			) : !result ? (
				<p className="adm-hint">Analysing…</p>
			) : tab === "seo" && !result.seo ? (
				<p className="adm-hint">Enter a focus keyphrase above to see the SEO analysis.</p>
			) : (
				<ul className="adm-analysis__list" role="tabpanel">
					{current?.items.map((i) => (
						<li key={i.id}>
							<span className={`adm-dot adm-dot--${i.rating}`} role="img" aria-label={LABEL[i.rating]} />
							<span className="adm-analysis__text" dangerouslySetInnerHTML={{ __html: messageHtml(i.html) }} />
							{i.marks.length > 0 && <EyeButton on={shown === `${tab}:${i.id}`} count={i.marks.length} onClick={() => setShown((s) => (s === `${tab}:${i.id}` ? null : `${tab}:${i.id}`))} />}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

/** Yoast's eye button: highlights the text a check is about in the article. */
function EyeButton({ on, count, onClick }: { on: boolean; count: number; onClick: () => void }) {
	const label = on ? "Hide the highlights in the article" : `Highlight ${count === 1 ? "this" : `these ${count}`} in the article`;
	return (
		<button type="button" className="adm-eye" onClick={onClick} title={label} aria-label={label} aria-pressed={on}>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
				<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		</button>
	);
}
