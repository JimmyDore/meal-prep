import { asc } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema/tags";

export async function getAllTags() {
  return db.select().from(tags).orderBy(asc(tags.name));
}
