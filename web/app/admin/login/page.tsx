import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignInForm } from "../AuthForms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
	if (await currentUser()) redirect("/admin/");
	const [{ count }] = await db()<{ count: string }[]>`select count(*) from users`;
	if (Number(count) === 0) redirect("/admin/setup/");
	return (
		<main className="adm-auth">
			<div className="adm-auth__card">
				<p className="adm-auth__brand">Stephen Legal</p>
				<h1>Sign in to the admin</h1>
				<SignInForm next={(await searchParams).next} />
				<p className="adm-auth__foot">
					<Link href="/">← Back to the site</Link>
				</p>
			</div>
		</main>
	);
}
