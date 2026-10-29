/** The confirmation or error passed back in the address after a form action (?ok= / ?error=). */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
	if (error)
		return (
			<p className="adm-alert adm-alert--error" role="alert">
				{error}
			</p>
		);
	if (ok)
		return (
			<p className="adm-alert adm-alert--ok" role="status">
				{ok}
			</p>
		);
	return null;
}
