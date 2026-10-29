import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { CONTACT } from "./config";

/**
 * Form messages go out through the publication's own mailbox (SMTP settings
 * from the hosting control panel), so no paid email service is needed.
 */
const SMTP = {
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT) || 465,
	user: process.env.SMTP_USER,
	pass: process.env.SMTP_PASS,
};
const TO = process.env.FORM_TO || CONTACT.email;
const FROM = process.env.FORM_FROM || SMTP.user;

export const mailConfigured = Boolean(SMTP.host && SMTP.user && SMTP.pass);

let transport: Transporter | null = null;

export async function sendMail({ subject, text, replyTo }: { subject: string; text: string; replyTo: string }): Promise<void> {
	if (!mailConfigured) {
		if (process.env.NODE_ENV !== "production") {
			// Local development without SMTP settings: show the message instead of sending it.
			console.info(`[form] Would email ${TO}\nSubject: ${subject}\nReply-To: ${replyTo}\n\n${text}`);
			return;
		}
		throw new Error("SMTP is not configured");
	}
	transport ??= nodemailer.createTransport({
		host: SMTP.host,
		port: SMTP.port,
		secure: SMTP.port === 465,
		auth: { user: SMTP.user, pass: SMTP.pass },
		disableFileAccess: true,
		disableUrlAccess: true,
	});
	await transport.sendMail({ from: { name: "Stephen Legal website", address: FROM! }, to: TO, replyTo, subject, text });
}
