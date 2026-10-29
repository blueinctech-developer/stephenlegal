import { loadEditor } from "../../editor-data";
import { PostEditor } from "../../PostEditor";

export default async function NewPage() {
	const { post, categories, authors } = await loadEditor("page", null);
	return <PostEditor post={post} categories={categories} authors={authors} />;
}
