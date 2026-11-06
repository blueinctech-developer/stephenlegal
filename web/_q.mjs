import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [p] = await sql`select slug from posts where type='post' and status='published' limit 1`;
console.log(p.slug);
await sql.end();
