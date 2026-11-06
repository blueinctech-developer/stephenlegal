"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A destructive button that asks first, on the page itself. The browser's own
 * confirm() pop-up is not shown by some embedded browsers, which left delete
 * buttons doing nothing.
 */
export function ConfirmButton({
	label,
	question,
	confirmLabel = "Yes, delete",
	busyLabel = "Deleting…",
	busy = false,
	onConfirm,
}: {
	label: string;
	question: string;
	confirmLabel?: string;
	busyLabel?: string;
	busy?: boolean;
	onConfirm: () => void;
}) {
	const [asking, setAsking] = useState(false);
	const yes = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (asking) yes.current?.focus();
	}, [asking]);

	if (busy) return <span className="adm-hint" role="status">{busyLabel}</span>;
	if (!asking)
		return (
			<button type="button" className="adm-link adm-link--danger" onClick={() => setAsking(true)}>
				{label}
			</button>
		);
	return (
		<span className="adm-confirm" role="group" aria-label={question}>
			<span>{question}</span>
			<button
				ref={yes}
				type="button"
				className="btn btn--danger"
				onClick={() => {
					setAsking(false);
					onConfirm();
				}}
			>
				{confirmLabel}
			</button>
			<button type="button" className="adm-link" onClick={() => setAsking(false)} onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
				Cancel
			</button>
		</span>
	);
}
