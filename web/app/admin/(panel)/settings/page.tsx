import { requireUser } from "@/lib/auth";
import { mailConfigured } from "@/lib/mail";
import { getSettings, type MenuItem } from "@/lib/settings";
import { Flash } from "../Flash";
import { resetSettings, saveSettings } from "../settings-actions";

/** Site-wide settings that appear on the public pages. Administrators only. */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
	await requireUser("admin");
	const sp = await searchParams;
	const s = await getSettings();
	// One row per menu item, top-level items followed by their sub-items, plus empty rows for new ones.
	const rows: (MenuItem & { sub: boolean })[] = s.menu.flatMap((m) => [{ ...m, sub: false }, ...(m.children ?? []).map((c) => ({ ...c, sub: true }))]);
	const blanks = 6;

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Settings</h1>
			</header>
			<p className="adm-hint">These appear on every public page. Unchanged values are exactly what the WordPress site shows. Each section saves on its own.</p>
			<Flash ok={sp.ok} error={sp.error} />

			<Section id="menu" title="Header menu" hint="Rows appear in order of their number. A sub-item opens under the nearest top-level item above it. Clear both boxes or tick Remove to delete a row.">
				<div className="adm-table-wrap">
				<table className="adm-table adm-menu-table">
					<thead>
						<tr>
							<th scope="col">No.</th>
							<th scope="col">Label</th>
							<th scope="col">Link</th>
							<th scope="col">Level</th>
							<th scope="col">Icon</th>
							<th scope="col">Remove</th>
						</tr>
					</thead>
					<tbody>
						{[...rows, ...Array.from({ length: blanks }, () => null)].map((r, i) => (
							<tr key={i}>
								<td>
									<input aria-label={`Row ${i + 1} position`} name={`order_${i}`} type="number" min={1} max={99} defaultValue={i + 1} className="adm-input-num" />
								</td>
								<td>
									<input aria-label={`Row ${i + 1} label`} name={`label_${i}`} defaultValue={r?.label ?? ""} maxLength={80} />
								</td>
								<td>
									<input aria-label={`Row ${i + 1} link`} name={`href_${i}`} defaultValue={r?.href ?? ""} maxLength={300} placeholder="/category/case-law/" />
								</td>
								<td>
									<select aria-label={`Row ${i + 1} level`} name={`level_${i}`} defaultValue={r?.sub ? "sub" : "top"}>
										<option value="top">Top level</option>
										<option value="sub">Sub-item</option>
									</select>
								</td>
								<td>
									<label className="adm-check">
										<input type="checkbox" name={`bolt_${i}`} defaultChecked={r?.icon === "bolt"} /> <span>⚡</span>
									</label>
								</td>
								<td>
									<label className="adm-check">
										<input type="checkbox" name={`remove_${i}`} /> <span className="screen-reader-text">Remove row {i + 1}</span>
									</label>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				</div>
			</Section>

			<Section id="social" title="Social links" hint="Shown as icons in the header and footer. Use # for no link.">
				<Field name="facebook" label="Facebook" value={s.social.facebook} />
				<Field name="x" label="X (Twitter)" value={s.social.x} />
				<Field name="instagram" label="Instagram" value={s.social.instagram} />
				<Field name="youtube" label="YouTube" value={s.social.youtube} />
				<Field name="linkedin" label="LinkedIn" value={s.social.linkedin} />
			</Section>

			<Section id="footer" title="Footer" hint="The “Email Us” and “Contact” lines and the copyright notice.">
				<Field name="email" label="Email Us" value={s.footer.email} type="email" />
				<Field name="phone" label="Contact (phone)" value={s.footer.phone} />
				<Field name="copyright" label="Copyright line" value={s.footer.copyright} />
			</Section>

			<Section id="panel" title="Side panel contact details" hint="Shown in the panel that opens from the two-bar button left of the logo. The WordPress site still shows the theme’s placeholder text here. The phone number here is also the one printed on the Contact page.">
				<Field name="address" label="Address" value={s.panel.address} />
				<Field name="phone" label="Phone" value={s.panel.phone} />
				<Field name="email" label="Email" value={s.panel.email} />
			</Section>

			<Section
				id="forms"
				title="Forms"
				hint={`Contact, Become a Contributor and the footer newsletter. Messages are always saved under Messages.${mailConfigured ? "" : " Email isn’t set up yet (SMTP settings), so nothing is emailed until it is."}`}
			>
				<Field name="notifyTo" label="Send notifications to" value={s.forms.notifyTo} type="email" hint="Leave empty to use info@stephenlegal.ng." />
				<Field name="contactConfirmation" label="Contact form: thank-you message" value={s.forms.contactConfirmation} />
				<Field name="contributorConfirmation" label="Contributor form: thank-you message" value={s.forms.contributorConfirmation} />
				<Field name="newsletterConfirmation" label="Newsletter: thank-you message" value={s.forms.newsletterConfirmation} />
				<fieldset className="adm-fieldset">
					<legend>Automatic reply to people who use the Contact form</legend>
					<label className="adm-check">
						<input type="checkbox" name="autoReplyEnabled" defaultChecked={s.forms.autoReply.enabled} /> Send an automatic reply
					</label>
					<Field name="autoReplySubject" label="Subject" value={s.forms.autoReply.subject} />
					<div className="adm-field">
						<label htmlFor="autoReplyBody">Message</label>
						<textarea id="autoReplyBody" name="autoReplyBody" rows={5} defaultValue={s.forms.autoReply.body} maxLength={3000} />
						<p className="adm-hint">{"{name}"} is replaced by the sender’s name.</p>
					</div>
				</fieldset>
			</Section>
		</main>
	);
}

function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
	return (
		<section className="adm-box adm-settings" id={id} aria-labelledby={`${id}-title`}>
			<h2 id={`${id}-title`}>{title}</h2>
			<p className="adm-hint">{hint}</p>
			<form action={saveSettings} className="adm-stack">
				<input type="hidden" name="section" value={id} />
				{children}
				<div className="adm-actions">
					<button className="btn" type="submit">
						Save {title.toLowerCase()}
					</button>
				</div>
			</form>
			<form action={resetSettings} className="adm-reset">
				<input type="hidden" name="section" value={id} />
				<button className="adm-link" type="submit">
					Put back the original {title.toLowerCase()}
				</button>
			</form>
		</section>
	);
}

function Field({ name, label, value, type = "text", hint }: { name: string; label: string; value: string; type?: string; hint?: string }) {
	const id = `f-${name}-${label.length}`;
	return (
		<div className="adm-field">
			<label htmlFor={id}>{label}</label>
			<input id={id} name={name} type={type} defaultValue={value} maxLength={500} />
			{hint && <p className="adm-hint">{hint}</p>}
		</div>
	);
}
