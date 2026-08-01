-- Migration: add notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "actor_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "content" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "post_id" INTEGER REFERENCES "posts"("id") ON DELETE SET NULL,
  "comment_id" INTEGER REFERENCES "comments"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "notifications_user_read_created_at_idx" ON "notifications" ("user_id", "read", "created_at");
