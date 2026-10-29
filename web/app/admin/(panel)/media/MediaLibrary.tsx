"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMedia, updateMedia, uploadMedia } from "../media-actions";

type Item = { id: number; url: string; alt: string; caption: string; width: number | null; height: number | null; mime: string; size: number | null; created: string };

const kb = (n: number | null) => (n ? (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`) : "");

export function MediaLibrary({ items }: { items: Item[] }) {
	const router = useRouter();
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
	const [busy, startTransition] = useTransition();
	const [uploading, setUploading] = useState(false);

	const upload = async (form: HTMLFormElement) => {
		const files = (form.elements.namedItem("files") as HTMLInputElement).files;
		if (!files?.length) return setMessage({ ok: false, text: "Choose one or more files." });
		setUploading(true);
		let done = 0;
		const failed: string[] = [];
		for (const file of Array.from(files)) {
			const data = new FormData();
			data.set("file", file);
			const result = await uploadMedia(data);
			if (result.ok) done++;
			else failed.push(`${file.name}: ${result.error}`);
		}
		setUploading(false);
		form.reset();
		setMessage(failed.length ? { ok: false, text: `${done} uploaded. ${failed.join(" ")}` } : { ok: true, text: `${done} file${done === 1 ? "" : "s"} uploaded. Add a description to each image.` });
		router.refresh();
	};

	const run = (action: (f: FormData) => Promise<{ ok: boolean; error?: string }>, form: HTMLFormElement, okText: string) =>
		startTransition(async () => {
			const result = await action(new FormData(form));
			setMessage(result.ok ? { ok: true, text: okText } : { ok: false, text: result.error ?? "Something went wrong." });
			router.refresh();
		});

	return (
		<>
			<form
				className="adm-box adm-upload"
				onSubmit={(e) => {
					e.preventDefault();
					void upload(e.currentTarget);
				}}
			>
				<div className="adm-field">
					<label htmlFor="files">Upload images or PDFs</label>
					<p className="adm-hint" id="files-hint">
						Up to 10 MB each. Large photos are resized automatically.
					</p>
					<input id="files" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf" aria-describedby="files-hint" />
				</div>
				<button className="btn" type="submit" disabled={uploading}>
					{uploading ? "Uploading…" : "Upload"}
				</button>
			</form>
			<div aria-live="polite">
				{message && (
					<p className={`adm-alert ${message.ok ? "adm-alert--ok" : "adm-alert--error"}`} role={message.ok ? "status" : "alert"}>
						{message.text}
					</p>
				)}
			</div>
			<ul className="adm-grid">
				{items.map((m) => (
					<li key={m.id} className="adm-media">
						<a href={m.url} target="_blank" rel="noopener" className="adm-media__img">
							{m.mime.startsWith("image/") ? (
								// eslint-disable-next-line @next/next/no-img-element -- admin thumbnails
								<img src={m.url} alt="" loading="lazy" />
							) : (
								<span className="adm-media__file">PDF</span>
							)}
							<span className="screen-reader-text">Open {m.url.split("/").pop()} in a new tab</span>
						</a>
						<p className="adm-media__meta">
							{m.url.split("/").pop()}
							<br />
							{m.width && m.height ? `${m.width}×${m.height} · ` : ""}
							{kb(m.size)}
						</p>
						{m.mime.startsWith("image/") && !m.alt && <p className="adm-pill adm-pill--draft">Needs description</p>}
						<details>
							<summary>Edit</summary>
							<form
								className="adm-stack"
								onSubmit={(e) => {
									e.preventDefault();
									run(updateMedia, e.currentTarget, "Saved.");
								}}
							>
								<input type="hidden" name="id" value={m.id} />
								<div className="adm-field">
									<label htmlFor={`alt-${m.id}`}>Description (alt text)</label>
									<input id={`alt-${m.id}`} name="alt" defaultValue={m.alt} />
								</div>
								<div className="adm-field">
									<label htmlFor={`cap-${m.id}`}>Caption</label>
									<input id={`cap-${m.id}`} name="caption" defaultValue={m.caption} />
								</div>
								<button className="btn" type="submit" disabled={busy}>
									Save
								</button>
							</form>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (window.confirm("Delete this file permanently?")) run(deleteMedia, e.currentTarget, "File deleted.");
								}}
							>
								<input type="hidden" name="id" value={m.id} />
								<button className="adm-link adm-link--danger" type="submit" disabled={busy}>
									Delete file
								</button>
							</form>
						</details>
					</li>
				))}
			</ul>
		</>
	);
}
