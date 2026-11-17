import "server-only";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import nodemailer, { type Transporter } from "nodemailer";
import { CONTACT } from "./config";

/**
 * Form notifications and the Contact form's automatic reply. Sent through Amazon SES
 * (SES_* settings, as on lexpraxis) when it is set up; otherwise through a mailbox's SMTP
 * settings (SMTP_*). With neither, local development prints the message instead.
 */

// One AWS access key can serve both S3 (media) and SES, so the SES_* values fall back to the S3_* ones.
const SES = {
	region: process.env.SES_REGION || process.env.S3_REGION,
	accessKeyId: process.env.SES_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
	secretAccessKey: process.env.SES_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
	configurationSet: process.env.SES_CONFIGURATION_SET || undefined,
};
const SMTP = {
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT) || 465,
	user: process.env.SMTP_USER,
	pass: process.env.SMTP_PASS,
};

const sesConfigured = Boolean(SES.region && SES.accessKeyId && SES.secretAccessKey);
const smtpConfigured = Boolean(SMTP.host && SMTP.user && SMTP.pass);

/** Which way email goes out, if any (shown in Admin → Settings). */
export const mailProvider: "ses" | "smtp" | null = sesConfigured ? "ses" : smtpConfigured ? "smtp" : null;
export const mailConfigured = mailProvider !== null;

const TO = process.env.FORM_TO || CONTACT.email;
/** With SES the sender must be on the verified domain; with SMTP, the mailbox itself. */
const FROM = process.env.FORM_FROM || (sesConfigured ? "no-reply@stephenlegal.ng" : SMTP.user) || "";
const FROM_NAME = "Stephen Legal website";

let ses: SESv2Client | null = null;
let transport: Transporter | null = null;

/** Header-safe sender: "Name" <address>, with no line breaks or angle brackets in the address. */
const fromHeader = () => `"${FROM_NAME}" <${FROM.replace(/[\r\n<>"]/g, "")}>`;

/** `to` defaults to FORM_TO (info@stephenlegal.ng); Admin → Settings can name another address. */
export async function sendMail({ subject, text, replyTo, to = TO }: { subject: string; text: string; replyTo: string; to?: string }): Promise<void> {
	if (mailProvider === "ses") {
		ses ??= new SESv2Client({ region: SES.region, credentials: { accessKeyId: SES.accessKeyId!, secretAccessKey: SES.secretAccessKey! } });
		await ses.send(
			new SendEmailCommand({
				FromEmailAddress: fromHeader(),
				Destination: { ToAddresses: [to] },
				ReplyToAddresses: replyTo ? [replyTo] : undefined,
				ConfigurationSetName: SES.configurationSet,
				Content: { Simple: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" } } } },
			}),
		);
		return;
	}
	if (mailProvider === "smtp") {
		transport ??= nodemailer.createTransport({
			host: SMTP.host,
			port: SMTP.port,
			secure: SMTP.port === 465,
			auth: { user: SMTP.user, pass: SMTP.pass },
			disableFileAccess: true,
			disableUrlAccess: true,
		});
		await transport.sendMail({ from: { name: FROM_NAME, address: FROM }, to, replyTo, subject, text });
		return;
	}
	if (process.env.NODE_ENV !== "production") {
		// Local development without email settings: show the message instead of sending it.
		console.info(`[form] Would email ${to}\nSubject: ${subject}\nReply-To: ${replyTo}\n\n${text}`);
		return;
	}
	throw new Error("Email is not set up (SES_* or SMTP_* settings)");
}
