import { notFound } from "next/navigation";
import { loadEditor } from "../../editor-data";
import { PostEditor } from "../../PostEditor";

export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
	const id = Number((await params).id);
	if (!Number.isInteger(id) || id < 1) notFound();
	const { post, categories, authors } = await loadEditor("page", id);
	// Keyed by id so moving between items starts with fresh editor state.
	return <PostEditor key={post.id} post={post} categories={categories} authors={authors} justSaved={Boolean((await searchParams).saved)} />;
}
