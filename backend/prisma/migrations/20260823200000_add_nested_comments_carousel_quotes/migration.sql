ALTER TABLE "posts"
  ADD COLUMN "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "quoted_post_id" INTEGER,
  ADD CONSTRAINT "posts_quoted_post_id_fkey" FOREIGN KEY ("quoted_post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "comments"
  ADD COLUMN "parent_id" INTEGER,
  ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "posts_quoted_post_id_idx" ON "posts"("quoted_post_id");
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");
