"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/client";
import { uploadMedia } from "@/app/admin/(panel)/media-actions";

export type PickedMedia = { id: number; url: string; alt: string; width: number | null; height: number | null };

/** Dialog to choose an image from the library, or upload a new one. */
export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (m: PickedMedia) => void }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const [q, setQ] = useState("");
	const [items, setItems] = useState<PickedMedia[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [reload, setReload] = useState(0);
	const isClient = useIsClient();

	useEffect(() => {
		const d = dialog.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		if (!open && d.open) d.close();
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const controller = new AbortController();
		const t = setTimeout(async () => {
			setLoading(true);
			try {
				const res = await fetch(`/admin/api/media/?q=${encodeURIComponent(q)}`, { signal: controller.signal });
				const data = (await res.json()) as { items: PickedMedia[] };
				setItems(data.items ?? []);
				setError(null);
			} catch (e) {
				if ((e as Error).name !== "AbortError") setError("The library couldn’t be loaded. Try again.");
			} finally {
				setLoading(false);
			}
		}, 250);
		return () => {
			clearTimeout(t);
			controller.abort();
		};
	}, [open, q, reload]);

	const upload = async (form: HTMLFormElement) => {
		setUploading(true);
		setError(null);
		const result = await uploadMedia(new FormData(form));
		setUploading(false);
		if (!result.ok) return setError(result.error);
		form.reset();
		onPick(result.item);
		setReload((n) => n + 1);
	};

	// Rendered at the end of <body>: the picker has its own upload form, and forms can't be nested.
	if (!isClient) return null;
	return createPortal(
		<dialog ref={dialog} className="adm-dialog" aria-labelledby="picker-title" onClose={onClose} onCancel={onClose} onChange={(e) => e.stopPropagation()}>
			<div className="adm-dialog__head">
				<h2 id="picker-title">Choose an image</h2>
				<button type="button" className="adm-link" onClick={onClose}>
					Close
				</button>
			</div>
			<form
				className="adm-upload"
				onSubmit={(e) => {
					e.preventDefault();
					// React events bubble through the portal to the article form; keep this submit to itself.
					e.stopPropagation();
					void upload(e.currentTarget);
				}}
			>
				<div className="adm-field">
					<label htmlFor="picker-file">Upload a new image</label>
					<input id="picker-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" required />
				</div>
				<div className="adm-field">
					<label htmlFor="picker-alt">Description for screen readers</label>
					<input id="picker-alt" name="alt" placeholder="What the image shows" />
				</div>
				<button type="submit" className="btn" disabled={uploading}>
					{uploading ? "Uploading…" : "Upload and use"}
				</button>
			</form>
			{error && (
				<p className="adm-alert adm-alert--error" role="alert">
					{error}
				</p>
			)}
			<div className="adm-field">
				<label htmlFor="picker-q">Search the library</label>
				<input id="picker-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="File name or description" />
			</div>
			<p className="adm-hint" aria-live="polite">
				{loading ? "Loading…" : `${items.length} image${items.length === 1 ? "" : "s"}`}
			</p>
			<ul className="adm-grid adm-grid--pick">
				{items.map((m) => (
					<li key={m.id}>
						<button type="button" onClick={() => onPick(m)} className="adm-thumb">
							{/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails from the library */}
							<img src={m.url} alt="" loading="lazy" />
							<span>{m.alt || m.url.split("/").pop()}</span>
						</button>
					</li>
				))}
			</ul>
		</dialog>,
		document.body,
	);
}
