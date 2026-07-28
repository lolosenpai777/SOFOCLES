CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3), ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "posts" ADD COLUMN "hidden_at" TIMESTAMP(3);

CREATE TABLE "reports" (
  "id" SERIAL PRIMARY KEY, "reason" TEXT NOT NULL, "details" TEXT, "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewed_at" TIMESTAMP(3), "reporter_id" INTEGER NOT NULL,
  "reported_user_id" INTEGER, "post_id" INTEGER,
  CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "reports_target_check" CHECK (("reported_user_id" IS NOT NULL)::int + ("post_id" IS NOT NULL)::int = 1)
);
CREATE TABLE "user_blocks" ("blocker_id" INTEGER NOT NULL, "blocked_id" INTEGER NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("blocker_id", "blocked_id"), CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "user_blocks_different_check" CHECK ("blocker_id" <> "blocked_id"));
CREATE TABLE "user_mutes" ("muter_id" INTEGER NOT NULL, "muted_id" INTEGER NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("muter_id", "muted_id"), CONSTRAINT "user_mutes_muter_id_fkey" FOREIGN KEY ("muter_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "user_mutes_muted_id_fkey" FOREIGN KEY ("muted_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "user_mutes_different_check" CHECK ("muter_id" <> "muted_id"));
CREATE TABLE "password_reset_tokens" ("id" SERIAL PRIMARY KEY, "token_hash" TEXT NOT NULL UNIQUE, "expires_at" TIMESTAMP(3) NOT NULL, "used_at" TIMESTAMP(3), "user_id" INTEGER NOT NULL, CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE);
CREATE TABLE "email_verification_tokens" ("id" SERIAL PRIMARY KEY, "token_hash" TEXT NOT NULL UNIQUE, "expires_at" TIMESTAMP(3) NOT NULL, "used_at" TIMESTAMP(3), "user_id" INTEGER NOT NULL, CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE);

CREATE INDEX "users_created_at_idx" ON "users"("created_at");
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");
CREATE INDEX "posts_author_id_created_at_idx" ON "posts"("author_id", "created_at");
CREATE INDEX "comments_post_id_created_at_idx" ON "comments"("post_id", "created_at");
CREATE INDEX "comments_author_id_created_at_idx" ON "comments"("author_id", "created_at");
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");
CREATE INDEX "reports_reporter_id_created_at_idx" ON "reports"("reporter_id", "created_at");
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");
CREATE INDEX "user_mutes_muted_id_idx" ON "user_mutes"("muted_id");
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");
CREATE INDEX "email_verification_tokens_user_id_expires_at_idx" ON "email_verification_tokens"("user_id", "expires_at");
