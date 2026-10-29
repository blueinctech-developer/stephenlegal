"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitForm, type FormState } from "@/app/actions";
import { FORMS, type Field, type FormKind, type FormValues } from "@/lib/forms";

const INITIAL: FormState = { status: "idle", n: 0 };

/** Contact / contributor form. Works without JavaScript; with it, errors show in place and success animates in. */
export function SiteForm({ kind }: { kind: FormKind }) {
	const def = FORMS[kind];
	const [state, action, pending] = useActionState(submitForm.bind(null, kind), INITIAL);
	const [dismissed, setDismissed] = useState(0);
	const reduce = useReducedMotion();
	const summaryRef = useRef<HTMLDivElement>(null);
	const sent = state.status === "ok" && dismissed !== state.n;

	useEffect(() => {
		if (state.status === "invalid" || state.status === "failed") summaryRef.current?.focus();
	}, [state]);

	const errors = state.errors ?? {};
	const values: FormValues = state.status === "ok" ? {} : (state.values ?? {});
	const errorList = def.fields.filter((f) => errors[f.name]);

	return (
		<section className="site-form" aria-labelledby={`${kind}-title`}>
			<h2 id={`${kind}-title`} className="site-form__title">
				{def.title}
			</h2>
			<AnimatePresence mode="wait" initial={false}>
				{sent ? (
					<motion.div
						key="sent"
						// Mounts after the form has faded out, so focus it as it appears.
						ref={(el) => el?.focus()}
						tabIndex={-1}
						role="status"
						className="site-form__done"
						initial={{ opacity: 0, y: reduce ? 0 : 16 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
					>
						<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<motion.path
								d="M4 12.5l5 5L20 6.5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								initial={{ pathLength: reduce ? 1 : 0 }}
								animate={{ pathLength: 1 }}
								transition={{ duration: 0.5, delay: 0.15 }}
							/>
						</svg>
						<p>{state.message}</p>
						<button type="button" className="btn btn--ghost" onClick={() => setDismissed(state.n)}>
							Send another
						</button>
					</motion.div>
				) : (
					<motion.form key="form" action={action} noValidate className="site-form__form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						{/* Remounted after each reply so the inputs pick up the returned values. */}
						<div key={state.n} className="site-form__fields">
							{(state.status === "invalid" || state.status === "failed") && (
								<div ref={summaryRef} tabIndex={-1} role="alert" className="site-form__alert">
									<p>{state.message}</p>
									{errorList.length > 0 && (
										<ul>
											{errorList.map((f) => (
												<li key={f.name}>
													<a href={`#${kind}-${f.name}`}>{errors[f.name]}</a>
												</li>
											))}
										</ul>
									)}
								</div>
							)}
							<p className="site-form__req">
								Fields marked <span aria-hidden="true">*</span>
								<span className="screen-reader-text">with an asterisk</span> are required.
							</p>
							{def.fields.map((f) => (
								<FieldRow key={f.name} kind={kind} field={f} value={values[f.name] ?? ""} error={errors[f.name]} />
							))}
							<div className="site-form__trap" aria-hidden="true">
								<label htmlFor={`${kind}-website`}>Leave this empty</label>
								<input id={`${kind}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
							</div>
						</div>
						<button type="submit" className="btn site-form__submit" disabled={pending} aria-disabled={pending}>
							{pending ? "Sending…" : def.submit}
						</button>
					</motion.form>
				)}
			</AnimatePresence>
		</section>
	);
}

function FieldRow({ kind, field: f, value, error }: { kind: FormKind; field: Field; value: string; error?: string }) {
	const id = `${kind}-${f.name}`;
	const describedBy = [f.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
	const mark = f.required ? <span aria-hidden="true"> *</span> : null;
	const hint = f.hint && (
		<p id={`${id}-hint`} className="field__hint">
			{f.hint}
		</p>
	);
	const err = error && (
		<p id={`${id}-error`} className="field__error">
			{error}
		</p>
	);

	if (f.type === "radio") {
		return (
			<fieldset className={`field field--radio${error ? " has-error" : ""}`} aria-describedby={describedBy} id={id} tabIndex={-1}>
				<legend>
					{f.label}
					{mark}
				</legend>
				{hint}
				{err}
				<div className="field__choices">
					{f.options!.map((o) => (
						<label key={o} className="choice">
							<input type="radio" name={f.name} value={o} defaultChecked={value === o} required={f.required} />
							<span>{o}</span>
						</label>
					))}
				</div>
			</fieldset>
		);
	}

	const common = {
		id,
		name: f.name,
		defaultValue: value,
		required: f.required,
		maxLength: f.maxLength,
		autoComplete: f.autoComplete,
		inputMode: f.inputMode,
		"aria-invalid": error ? true : undefined,
		"aria-describedby": describedBy,
	};
	return (
		<div className={`field field--${f.name}${error ? " has-error" : ""}`}>
			<label htmlFor={id}>
				{f.label}
				{mark}
			</label>
			{hint}
			{err}
			{f.type === "textarea" ? <textarea {...common} rows={7} minLength={f.minLength} /> : <input {...common} type={f.type} />}
		</div>
	);
}
