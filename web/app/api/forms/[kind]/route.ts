import { NextResponse, type NextRequest } from "next/server";
import { deliver, type InboxKind } from "@/lib/deliver";
import { FORMS, validateForm, type FormValues } from "@/lib/forms";
import { FIELD_NAMES, GF_IDS } from "@/lib/legacy/forms";

/**
 * Receives the site's forms (contact, contributor, newsletter), which keep the old
 * Gravity Forms markup and field names, then returns the visitor to the page with
 * ?gf=<form>&sent=1 (or &error=…), which public/legacy/site.js turns into the
 * confirmation or error message.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
	const { kind } = await params;
	if (!(kind in GF_IDS)) return new NextResponse("Not found", { status: 404 });
	const k = kind as InboxKind;
	const form = await request.formData();

	const referer = request.headers.get("referer");
	const back = new URL(referer && new URL(referer).host === request.nextUrl.host ? referer : "/", request.nextUrl);
	back.search = "";
	back.searchParams.set("gf", String(GF_IDS[k]));
	back.hash = `gf_${GF_IDS[k]}`;
	const done = (error?: string) => {
		if (error) back.searchParams.set("error", error);
		else back.searchParams.set("sent", "1");
		return NextResponse.redirect(back, 303);
	};

	// Hidden field that people never see; bots that fill it get a quiet "success".
	if (String(form.get("website") ?? "")) return done();

	const input: FormValues = {};
	for (const [name, field] of Object.entries(FIELD_NAMES[k])) input[field] = String(form.get(name) ?? "").slice(0, 5000);

	let values: FormValues;
	if (k === "newsletter") {
		const email = input.email.trim();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return done("Please enter a valid email address.");
		values = { name: email, email };
	} else {
		const checked = validateForm(FORMS[k], input);
		if (Object.keys(checked.errors).length) return done(Object.values(checked.errors)[0]);
		values = checked.values;
	}
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	return done((await deliver(k, values, ip)) ?? undefined);
}
