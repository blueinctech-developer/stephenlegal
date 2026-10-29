"use client";

import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { MediaPicker, type PickedMedia } from "./MediaPicker";

type Props = { id: string; initialHtml: string; onChange: (html: string) => void; labelledBy: string };

/** The article body editor: formatting toolbar, links, images from the media library, and an HTML view. */
export function RichEditor({ id, initialHtml, onChange, labelledBy }: Props) {
	const [mode, setMode] = useState<"visual" | "html">("visual");
	const [html, setHtml] = useState(initialHtml);
	const editor = useEditor({
		extensions: [
			StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" }, code: false, codeBlock: false }),
			Image.configure({ inline: false }),
			TableKit.configure({ table: { resizable: false } }),
		],
		content: initialHtml,
		immediatelyRender: false,
		editorProps: { attributes: { class: "adm-prose entry-content", id, "aria-labelledby": labelledBy, "aria-multiline": "true", role: "textbox" } },
		onUpdate: ({ editor }) => {
			const next = editor.getHTML();
			setHtml(next);
			onChange(next);
		},
	});

	const switchMode = (next: "visual" | "html") => {
		if (next === mode) return;
		if (next === "visual") editor?.commands.setContent(html, { emitUpdate: false });
		setMode(next);
	};

	return (
		<div className="adm-editor">
			<div className="adm-editor__bar">
				{mode === "visual" && editor ? <Toolbar editor={editor} /> : <span className="adm-hint">Editing HTML. Unsupported tags are removed when you save.</span>}
				<div className="adm-seg" role="group" aria-label="Editor view">
					<button type="button" aria-pressed={mode === "visual"} onClick={() => switchMode("visual")}>
						Visual
					</button>
					<button type="button" aria-pressed={mode === "html"} onClick={() => switchMode("html")}>
						HTML
					</button>
				</div>
			</div>
			{mode === "visual" ? (
				<EditorContent editor={editor} />
			) : (
				<textarea
					className="adm-editor__html"
					aria-labelledby={labelledBy}
					value={html}
					spellCheck={false}
					onChange={(e) => {
						setHtml(e.target.value);
						onChange(e.target.value);
					}}
				/>
			)}
		</div>
	);
}

function Toolbar({ editor }: { editor: Editor }) {
	const state = useEditorState({
		editor,
		selector: ({ editor: e }) => ({
			block: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : e.isActive("heading", { level: 4 }) ? "h4" : "p",
			bold: e.isActive("bold"),
			italic: e.isActive("italic"),
			underline: e.isActive("underline"),
			link: e.isActive("link"),
			bullet: e.isActive("bulletList"),
			ordered: e.isActive("orderedList"),
			quote: e.isActive("blockquote"),
			table: e.isActive("table"),
			canUndo: e.can().undo(),
			canRedo: e.can().redo(),
		}),
	});
	const [linkOpen, setLinkOpen] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const linkInput = useRef<HTMLInputElement>(null);

	const setBlock = (value: string) => {
		const chain = editor.chain().focus();
		if (value === "p") chain.setParagraph().run();
		else chain.setHeading({ level: Number(value.slice(1)) as 2 | 3 | 4 }).run();
	};

	const applyLink = (e: React.FormEvent) => {
		e.preventDefault();
		const url = linkInput.current?.value.trim() ?? "";
		if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
		else editor.chain().focus().extendMarkRange("link").setLink({ href: /^(https?:|mailto:|tel:|\/)/.test(url) ? url : `https://${url}` }).run();
		setLinkOpen(false);
	};

	const insertImage = (m: PickedMedia) => {
		editor.chain().focus().setImage({ src: m.url, alt: m.alt }).run();
		setPickerOpen(false);
	};

	const btn = (label: string, pressed: boolean | undefined, onClick: () => void, text: React.ReactNode, disabled = false) => (
		<button type="button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick} disabled={disabled}>
			{text}
		</button>
	);

	return (
		<div className="adm-tools" role="toolbar" aria-label="Formatting">
			<label className="screen-reader-text" htmlFor="adm-block">
				Text style
			</label>
			<select id="adm-block" value={state.block} onChange={(e) => setBlock(e.target.value)}>
				<option value="p">Paragraph</option>
				<option value="h2">Heading</option>
				<option value="h3">Subheading</option>
				<option value="h4">Minor heading</option>
			</select>
			<span className="adm-tools__sep" />
			{btn("Bold", state.bold, () => editor.chain().focus().toggleBold().run(), <b>B</b>)}
			{btn("Italic", state.italic, () => editor.chain().focus().toggleItalic().run(), <i>I</i>)}
			{btn("Underline", state.underline, () => editor.chain().focus().toggleUnderline().run(), <u>U</u>)}
			{btn("Link", state.link, () => setLinkOpen((o) => !o), "Link")}
			<span className="adm-tools__sep" />
			{btn("Bulleted list", state.bullet, () => editor.chain().focus().toggleBulletList().run(), "• List")}
			{btn("Numbered list", state.ordered, () => editor.chain().focus().toggleOrderedList().run(), "1. List")}
			{btn("Quote", state.quote, () => editor.chain().focus().toggleBlockquote().run(), "“ Quote")}
			{btn("Divider", undefined, () => editor.chain().focus().setHorizontalRule().run(), "—")}
			<span className="adm-tools__sep" />
			{btn("Insert image", undefined, () => setPickerOpen(true), "Image")}
			{state.table
				? btn("Remove table", undefined, () => editor.chain().focus().deleteTable().run(), "Remove table")
				: btn("Insert table", undefined, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), "Table")}
			<span className="adm-tools__sep" />
			{btn("Undo", undefined, () => editor.chain().focus().undo().run(), "↶", !state.canUndo)}
			{btn("Redo", undefined, () => editor.chain().focus().redo().run(), "↷", !state.canRedo)}

			{linkOpen && (
				<form className="adm-linkbox" onSubmit={applyLink}>
					<label htmlFor="adm-link-url">Link address</label>
					<input
						id="adm-link-url"
						ref={linkInput}
						type="text"
						inputMode="url"
						defaultValue={(editor.getAttributes("link").href as string) ?? ""}
						placeholder="https://… or /article-address/"
						autoFocus
						onKeyDown={(e) => e.key === "Escape" && setLinkOpen(false)}
					/>
					<button type="submit" className="btn">
						Apply
					</button>
					<span className="adm-hint">Leave empty to remove the link.</span>
				</form>
			)}
			<MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={insertImage} />
		</div>
	);
}
