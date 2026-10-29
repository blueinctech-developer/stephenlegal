/** Password rules shared by the browser forms and the server. */

export const MIN_PASSWORD_LENGTH = 12;

/** Returns a reason the password is too weak, or null. */
export function passwordProblem(password: string, email = ""): string | null {
	if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
	if (password.length > 200) return "Use 200 characters or fewer.";
	const name = email.split("@")[0].toLowerCase();
	if (name.length >= 3 && password.toLowerCase().includes(name)) return "Don’t include your email name in the password.";
	if (/^(.)\1+$/.test(password)) return "Avoid repeating one character.";
	return null;
}
