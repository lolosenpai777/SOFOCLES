ALTER TABLE "posts" ADD COLUMN "pinned_at" TIMESTAMP(3);
CREATE INDEX "posts_author_id_pinned_at_idx" ON "posts"("author_id", "pinned_at");
