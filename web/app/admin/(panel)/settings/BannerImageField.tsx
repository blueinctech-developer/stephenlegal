"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/admin/MediaPicker";

/** Admin → Settings → Ads: the sidebar banner image, chosen from (or uploaded to) Media. */
export function BannerImageField({ value }: { value: string }) {
	const [url, setUrl] = useState(value);
	const [open, setOpen] = useState(false);
	return (
		<div className="adm-field">
			<span className="adm-label">Banner image</span>
			<input type="hidden" name="bannerImage" value={url} />
			{url ? (
				<figure className="adm-featured adm-featured--whole">
					{/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
					<img src={url} alt="Current banner" />
				</figure>
			) : (
				<p className="adm-hint">No image chosen.</p>
			)}
			<div className="adm-actions">
				<button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
					{url ? "Replace image" : "Choose image"}
				</button>
			</div>
			<MediaPicker
				open={open}
				onClose={() => setOpen(false)}
				onPick={(m) => {
					setUrl(m.url);
					setOpen(false);
				}}
			/>
		</div>
	);
}
