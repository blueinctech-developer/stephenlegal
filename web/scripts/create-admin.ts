/**
 * Creates an administrator account from the command line (an alternative to
 * the /admin/setup/ page). The password is typed in the terminal and never
 * shown or stored anywhere but as a hash in the database.
 *
 *   npm run admin:create -- --email=editor@stephenlegal.ng --name="Stephen Azubuike"
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword, passwordProblem } from "../lib/password.ts";
import { connect } from "./_db.ts";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
const email = (args.email ?? "").trim().toLowerCase();
const name = (args.name ?? "").trim();
const role = args.role === "editor" ? "editor" : "admin";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
	console.error('Usage: npm run admin:create -- --email=you@example.com --name="Your Name" [--role=editor]');
	process.exit(1);
}

/** Reads a line without echoing it. */
function askHidden(question: string): Promise<string> {
	let muted = false;
	const output = new Writable({
		write(chunk, _enc, cb) {
			if (!muted) process.stdout.write(chunk);
			cb();
		},
	});
	const rl = createInterface({ input: process.stdin, output, terminal: true });
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			process.stdout.write("\n");
			resolve(answer);
		});
		muted = true;
	});
}

const password = await askHidden("Password (at least 12 characters, not shown): ");
const problem = passwordProblem(password, email);
if (problem) {
	console.error(problem);
	process.exit(1);
}
if ((await askHidden("Same password again: ")) !== password) {
	console.error("The passwords don’t match.");
	process.exit(1);
}

const sql = connect();
await sql`
	insert into users (email, name, role, password_hash) values (${email}, ${name}, ${role}, ${await hashPassword(password)})
	on conflict (email) do update set name = excluded.name, role = excluded.role, password_hash = excluded.password_hash`;
console.log(`${role === "admin" ? "Administrator" : "Editor"} account ready for ${email}. Sign in at /admin/.`);
await sql.end();
