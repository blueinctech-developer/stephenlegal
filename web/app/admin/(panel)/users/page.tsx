import { formatAdminDate } from "@/lib/admin-format";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import { Flash } from "../Flash";
import { createUser, deleteUser, updateUser } from "../manage-actions";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
	const me = await requireUser("admin");
	const sp = await searchParams;
	const sql = db();
	const [users, authors] = await Promise.all([
		sql<{ id: number; name: string; email: string; role: string; author_id: number | null; last_login_at: Date | null }[]>`
			select id, name, email, role, author_id, last_login_at from users order by name`,
		sql<{ id: number; name: string }[]>`select id, name from authors order by name`,
	]);

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Users</h1>
			</header>
			<p className="adm-hint">People who can sign in. Editors manage content; administrators can also manage accounts.</p>
			<Flash ok={sp.ok} error={sp.error} />
			<details className="adm-box">
				<summary>Add a user</summary>
				<form action={createUser} className="adm-stack">
					<div className="adm-field">
						<label htmlFor="u-name">Name</label>
						<input id="u-name" name="name" required autoComplete="off" />
					</div>
					<div className="adm-field">
						<label htmlFor="u-email">Email</label>
						<input id="u-email" name="email" type="email" required autoComplete="off" />
					</div>
					<div className="adm-field">
						<label htmlFor="u-role">Role</label>
						<select id="u-role" name="role" defaultValue="editor">
							<option value="editor">Editor</option>
							<option value="admin">Administrator</option>
						</select>
					</div>
					<div className="adm-field">
						<label htmlFor="u-password">Starting password</label>
						<p className="adm-hint" id="u-pw-hint">
							At least {MIN_PASSWORD_LENGTH} characters. Give it to them privately; they can change it under Account.
						</p>
						<input id="u-password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" aria-describedby="u-pw-hint" />
					</div>
					<button className="btn" type="submit">
						Create account
					</button>
				</form>
			</details>
			<div className="adm-table-wrap">
				<table className="adm-table">
					<thead>
						<tr>
							<th scope="col">Name</th>
							<th scope="col">Last sign-in</th>
							<th scope="col">Role and byline</th>
							<th scope="col">
								<span className="screen-reader-text">Remove</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{users.map((u) => (
							<tr key={u.id}>
								<td>
									<strong>{u.name}</strong>
									<span className="adm-table__slug">{u.email}</span>
								</td>
								<td>{u.last_login_at ? formatAdminDate(u.last_login_at) : "Never"}</td>
								<td>
									<form action={updateUser} className="adm-row">
										<input type="hidden" name="id" value={u.id} />
										<label className="screen-reader-text" htmlFor={`role-${u.id}`}>
											Role for {u.name}
										</label>
										<select id={`role-${u.id}`} name="role" defaultValue={u.role}>
											<option value="editor">Editor</option>
											<option value="admin">Administrator</option>
										</select>
										<label className="screen-reader-text" htmlFor={`author-${u.id}`}>
											Byline for {u.name}
										</label>
										<select id={`author-${u.id}`} name="author_id" defaultValue={u.author_id ?? ""}>
											<option value="">No byline</option>
											{authors.map((a) => (
												<option key={a.id} value={a.id}>
													{a.name}
												</option>
											))}
										</select>
										<button className="adm-link" type="submit">
											Save
										</button>
									</form>
								</td>
								<td>
									{u.id !== me.id && (
										<form action={deleteUser}>
											<input type="hidden" name="id" value={u.id} />
											<button className="adm-link adm-link--danger" type="submit">
												Remove<span className="screen-reader-text"> {u.name}</span>
											</button>
										</form>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</main>
	);
}
