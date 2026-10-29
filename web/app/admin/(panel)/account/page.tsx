import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import { Flash } from "../Flash";
import { changePassword, updateProfile } from "../manage-actions";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
	const me = await requireUser();
	const sp = await searchParams;
	return (
		<main className="adm-page adm-page--narrow">
			<header className="adm-head">
				<h1>Your account</h1>
			</header>
			<Flash ok={sp.ok} error={sp.error} />
			<section className="adm-box" aria-labelledby="profile-title">
				<h2 id="profile-title">Profile</h2>
				<form action={updateProfile} className="adm-stack">
					<div className="adm-field">
						<label htmlFor="name">Name</label>
						<input id="name" name="name" defaultValue={me.name} required autoComplete="name" />
					</div>
					<p className="adm-hint">Signed in as {me.email}.</p>
					<button className="btn" type="submit">
						Save
					</button>
				</form>
			</section>
			<section className="adm-box" aria-labelledby="pw-title">
				<h2 id="pw-title">Change password</h2>
				<form action={changePassword} className="adm-stack">
					<input type="email" name="username" autoComplete="username" value={me.email} readOnly hidden />
					<div className="adm-field">
						<label htmlFor="current">Current password</label>
						<input id="current" name="current" type="password" required autoComplete="current-password" />
					</div>
					<div className="adm-field">
						<label htmlFor="password">New password</label>
						<p className="adm-hint" id="pw-hint">
							At least {MIN_PASSWORD_LENGTH} characters.
						</p>
						<input id="password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" aria-describedby="pw-hint" />
					</div>
					<div className="adm-field">
						<label htmlFor="confirm">New password again</label>
						<input id="confirm" name="confirm" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
					</div>
					<button className="btn" type="submit">
						Change password
					</button>
				</form>
			</section>
		</main>
	);
}
