/** Creates or updates the database tables from db/schema.sql. Safe to run repeatedly. */
import { readFileSync } from "node:fs";
import { connect } from "./_db.ts";

const sql = connect();
await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
console.log("Database schema is up to date.");
await sql.end();
