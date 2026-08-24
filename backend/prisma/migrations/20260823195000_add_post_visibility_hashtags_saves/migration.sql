CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS');

ALTER TABLE "posts"
  ADD COLUMN "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "hashtags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "post_saves" (
  "user_id" INTEGER NOT NULL,
  "post_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_saves_pkey" PRIMARY KEY ("user_id", "post_id"),
  CONSTRAINT "post_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "post_saves_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "post_saves_post_id_created_at_idx" ON "post_saves"("post_id", "created_at");
