/**
 * Password hashing with scrypt (Node's built-in crypto). No server-only
 * import, so the create-admin script can use it too.
 */
export { MIN_PASSWORD_LENGTH, passwordProblem } from "./password-rules.ts";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
	new Promise<Buffer>((resolve, reject) => scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))));

const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await scrypt(password.normalize("NFKC"), salt, 32, PARAMS);
	return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [scheme, N, r, p, salt, hash] = stored.split("$");
	if (scheme !== "scrypt" || !salt || !hash) return false;
	const expected = Buffer.from(hash, "base64");
	const key = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem });
	return key.length === expected.length && timingSafeEqual(key, expected);
}
