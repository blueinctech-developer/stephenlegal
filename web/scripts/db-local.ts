/**
 * Local Postgres for development: real Postgres binaries from npm
 * (embedded-postgres), no install needed. Leave it running; Ctrl+C stops it.
 * Matching .env.local line: DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres
 *
 * Data lives in .data/postgres. Windows can't start programs from very long
 * folder paths, so there the binaries and data go to %LOCALAPPDATA%\stephenlegal-dev.
 */
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = "5433";
const pkg = `@embedded-postgres/${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
const packageBin = path.join(path.dirname(fileURLToPath(import.meta.resolve(pkg))), "..", "native", "bin");

let bin = packageBin;
let root = path.resolve(".data");
if (process.platform === "win32" && packageBin.length > 150) {
	root = path.join(process.env.LOCALAPPDATA || tmpdir(), "stephenlegal-dev");
	bin = path.join(root, "pg", "bin");
	if (!existsSync(path.join(bin, "postgres.exe"))) {
		console.log(`Copying Postgres to ${root} (first run only)…`);
		cpSync(path.dirname(packageBin), path.join(root, "pg"), { recursive: true });
	}
}
const exe = (name: string) => path.join(bin, process.platform === "win32" ? `${name}.exe` : name);
const data = path.join(root, "postgres");
mkdirSync(root, { recursive: true });

if (!existsSync(path.join(data, "PG_VERSION"))) {
	const pwfile = path.join(root, "pwfile");
	writeFileSync(pwfile, "postgres\n");
	const init = spawnSync(exe("initdb"), [`--pgdata=${data}`, "--auth=password", "--username=postgres", `--pwfile=${pwfile}`, "--encoding=UTF8", "--lc-messages=C"], {
		stdio: "inherit",
	});
	if (init.status !== 0) process.exit(init.status ?? 1);
}

const server = spawn(exe("postgres"), ["-D", data, "-p", PORT, "-h", "127.0.0.1"], { stdio: ["ignore", "pipe", "pipe"] });
let ready = false;
const watch = (chunk: Buffer) => {
	const text = chunk.toString();
	if (!ready && text.includes("ready to accept connections")) {
		ready = true;
		console.log(`Local Postgres ready on 127.0.0.1:${PORT} (data: ${data}). Ctrl+C to stop.`);
	} else if (/FATAL|ERROR/.test(text)) process.stderr.write(text);
};
server.stdout.on("data", watch);
server.stderr.on("data", watch);
server.on("exit", (code) => process.exit(code ?? 0));

const stop = () => spawnSync(exe("pg_ctl"), ["stop", "-D", data, "-m", "fast"], { stdio: "ignore" });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
