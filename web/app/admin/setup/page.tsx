import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SetupForm } from "../AuthForms";

/** Shown once: before any admin account exists, and only when a setup code is configured. */
export default async function SetupPage() {
	const [{ count }] = await db()<{ count: string }[]>`select count(*) from users`;
	if (Number(count) > 0) redirect("/admin/login/");
	const ready = (process.env.ADMIN_SETUP_TOKEN ?? "").length >= 16;
	return (
		<main className="adm-auth">
			<div className="adm-auth__card">
				<p className="adm-auth__brand">Stephen Legal</p>
				<h1>Create the first administrator</h1>
				{ready ? (
					<SetupForm />
				) : (
					<p className="adm-alert">
						Setup is locked. Add an <code>ADMIN_SETUP_TOKEN</code> setting (a random code of 16 or more characters) in the hosting dashboard, redeploy, then come back to
						this page. Or run <code>npm run admin:create</code> on a computer with the project.
					</p>
				)}
			</div>
		</main>
	);
}
