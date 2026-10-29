"use client";

import { useActionState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import { setupFirstAdmin, signIn, type AuthState } from "./auth-actions";

function Alert({ error }: { error?: string }) {
	return error ? (
		<p className="adm-alert adm-alert--error" role="alert">
			{error}
		</p>
	) : null;
}

export function SignInForm({ next }: { next?: string }) {
	const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
	return (
		<form action={action} className="adm-stack">
			<Alert error={state.error} />
			<input type="hidden" name="next" value={next ?? ""} />
			<div className="adm-field">
				<label htmlFor="email">Email</label>
				<input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} autoFocus />
			</div>
			<div className="adm-field">
				<label htmlFor="password">Password</label>
				<input id="password" name="password" type="password" autoComplete="current-password" required />
			</div>
			<button className="btn" type="submit" disabled={pending}>
				{pending ? "Signing in…" : "Sign in"}
			</button>
		</form>
	);
}

export function SetupForm() {
	const [state, action, pending] = useActionState<AuthState, FormData>(setupFirstAdmin, {});
	return (
		<form action={action} className="adm-stack">
			<Alert error={state.error} />
			<div className="adm-field">
				<label htmlFor="token">Setup code</label>
				<p className="adm-hint" id="token-hint">
					The ADMIN_SETUP_TOKEN value from the hosting settings.
				</p>
				<input id="token" name="token" type="password" autoComplete="off" required aria-describedby="token-hint" />
			</div>
			<div className="adm-field">
				<label htmlFor="name">Your name</label>
				<input id="name" name="name" autoComplete="name" required />
			</div>
			<div className="adm-field">
				<label htmlFor="email">Email</label>
				<input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} />
			</div>
			<div className="adm-field">
				<label htmlFor="password">Password</label>
				<p className="adm-hint" id="pw-hint">
					At least {MIN_PASSWORD_LENGTH} characters. A short sentence works well.
				</p>
				<input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required aria-describedby="pw-hint" />
			</div>
			<button className="btn" type="submit" disabled={pending}>
				{pending ? "Creating…" : "Create administrator"}
			</button>
		</form>
	);
}
