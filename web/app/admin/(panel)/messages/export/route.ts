import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/activity";
import { currentUser } from "@/lib/auth";
import { FORM_LABELS, listInbox, parseFilter, STATUS_LABELS } from "@/lib/inbox";

/** The Messages list, with its current filters, as a CSV file for Excel or Google Sheets. */
export async function GET(request: NextRequest) {
	const user = await currentUser();
	if (!user) return new NextResponse("Sign in first.", { status: 401 });
	const filter = parseFilter(Object.fromEntries(request.nextUrl.searchParams));
	const rows = await listInbox(filter, 10000);

	// Every field any message has, in a stable order after the fixed columns.
	const fields = [...new Set(rows.flatMap((r) => Object.keys(r.data)))];
	const header = ["Received", "Form", "Status", ...fields, "Notes", "Emailed"];
	// Quote every cell; a leading = + - @ would run as a formula in a spreadsheet, so prefix it.
	const cell = (v: unknown) => {
		const s = String(v ?? "").replace(/^([=+\-@\t\r])/, "'$1");
		return `"${s.replace(/"/g, '""')}"`;
	};
	const lines = [
		header.map(cell).join(","),
		...rows.map((r) =>
			[r.created_at.toISOString(), FORM_LABELS[r.form] ?? r.form, STATUS_LABELS[r.status] ?? r.status, ...fields.map((f) => r.data[f]), r.notes, r.email_sent ? "yes" : "no"]
				.map(cell)
				.join(","),
		),
	];
	await logActivity(user, "Exported messages", `${rows.length} rows`);
	return new NextResponse("﻿" + lines.join("\r\n"), {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="stephenlegal-messages-${new Date().toISOString().slice(0, 10)}.csv"`,
			"Cache-Control": "no-store",
		},
	});
}
