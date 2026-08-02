DO $$
BEGIN
  CREATE TYPE "ModerationRole" AS ENUM ('NONE', 'JUNIOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReportCategory" AS ENUM (
    'SPAM',
    'SEXUAL_CONTENT',
    'HATE_SPEECH',
    'HARASSMENT_BULLYING',
    'VIOLENCE_GRAPHIC',
    'MISINFORMATION',
    'SELF_HARM_SUICIDE',
    'MINOR_SAFETY',
    'IMPERSONATION',
    'COPYRIGHT_IP',
    'ILLEGAL_SALES',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ModerationActionType" AS ENUM (
    'DISMISS_REPORT',
    'ISSUE_WARNING',
    'DELETE_POST',
    'SUSPEND_TEMPORARY',
    'SUSPEND_PERMANENT',
    'AUTO_SUSPEND_7_DAYS',
    'COMMENT_RESTRICTION_24H'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SuspensionType" AS ENUM ('TEMPORARY', 'PERMANENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SuspensionScope" AS ENUM ('ACCOUNT', 'COMMENT_ONLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "moderation_role" "ModerationRole" NOT NULL DEFAULT 'NONE';

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "category" "ReportCategory";

UPDATE "reports"
SET "category" = CASE
  WHEN lower("reason") LIKE '%menor%' THEN 'MINOR_SAFETY'::"ReportCategory"
  WHEN lower("reason") LIKE '%suicid%' OR lower("reason") LIKE '%autolesi%' THEN 'SELF_HARM_SUICIDE'::"ReportCategory"
  WHEN lower("reason") LIKE '%violen%' OR lower("reason") LIKE '%grafi%' THEN 'VIOLENCE_GRAPHIC'::"ReportCategory"
  WHEN lower("reason") LIKE '%acoso%' OR lower("reason") LIKE '%bully%' THEN 'HARASSMENT_BULLYING'::"ReportCategory"
  WHEN lower("reason") LIKE '%odio%' OR lower("reason") LIKE '%discrimin%' THEN 'HATE_SPEECH'::"ReportCategory"
  WHEN lower("reason") LIKE '%spam%' THEN 'SPAM'::"ReportCategory"
  WHEN lower("reason") LIKE '%suplant%' THEN 'IMPERSONATION'::"ReportCategory"
  WHEN lower("reason") LIKE '%copyright%' OR lower("reason") LIKE '%autor%' THEN 'COPYRIGHT_IP'::"ReportCategory"
  WHEN lower("reason") LIKE '%ilegal%' OR lower("reason") LIKE '%venta%' THEN 'ILLEGAL_SALES'::"ReportCategory"
  WHEN lower("reason") LIKE '%desnud%' OR lower("reason") LIKE '%sexual%' THEN 'SEXUAL_CONTENT'::"ReportCategory"
  WHEN lower("reason") LIKE '%fals%' OR lower("reason") LIKE '%engañ%' THEN 'MISINFORMATION'::"ReportCategory"
  ELSE 'OTHER'::"ReportCategory"
END
WHERE "category" IS NULL;

ALTER TABLE "reports"
  ALTER COLUMN "category" SET DEFAULT 'OTHER',
  ALTER COLUMN "category" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "moderation_cases" (
  "id" SERIAL PRIMARY KEY,
  "post_id" INTEGER NOT NULL UNIQUE,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "priority_score" INTEGER NOT NULL DEFAULT 0,
  "reports_count" INTEGER NOT NULL DEFAULT 0,
  "distinct_reporters_count" INTEGER NOT NULL DEFAULT 0,
  "last_reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "auto_hidden_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_cases_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
);

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "case_id" INTEGER;

ALTER TABLE "reports"
  DROP CONSTRAINT IF EXISTS "reports_case_id_fkey";

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "moderation_cases"("id") ON DELETE CASCADE;

INSERT INTO "moderation_cases" (
  "post_id",
  "status",
  "priority_score",
  "reports_count",
  "distinct_reporters_count",
  "last_reported_at",
  "created_at",
  "updated_at"
)
SELECT
  "post_id",
  COALESCE(MAX("status"), 'OPEN')::"ReportStatus",
  0,
  COUNT(*)::INTEGER,
  COUNT(DISTINCT "reporter_id")::INTEGER,
  COALESCE(MAX("created_at"), CURRENT_TIMESTAMP),
  COALESCE(MIN("created_at"), CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "reports"
WHERE "post_id" IS NOT NULL
GROUP BY "post_id"
ON CONFLICT ("post_id") DO NOTHING;

UPDATE "reports" r
SET "case_id" = mc."id"
FROM "moderation_cases" mc
WHERE r."post_id" = mc."post_id"
  AND r."post_id" IS NOT NULL
  AND r."case_id" IS NULL;

CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" SERIAL PRIMARY KEY,
  "action_type" "ModerationActionType" NOT NULL,
  "reason" TEXT NOT NULL,
  "duration_hours" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "moderator_id" INTEGER NOT NULL,
  "report_id" INTEGER,
  "case_id" INTEGER,
  "target_user_id" INTEGER,
  "target_post_id" INTEGER,
  CONSTRAINT "moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "moderation_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL,
  CONSTRAINT "moderation_actions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "moderation_cases"("id") ON DELETE SET NULL,
  CONSTRAINT "moderation_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "moderation_actions_target_post_id_fkey" FOREIGN KEY ("target_post_id") REFERENCES "posts"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "user_warnings" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "moderation_action_id" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_warnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_warnings_moderation_action_id_fkey" FOREIGN KEY ("moderation_action_id") REFERENCES "moderation_actions"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_suspensions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "moderation_action_id" INTEGER,
  "type" "SuspensionType" NOT NULL,
  "scope" "SuspensionScope" NOT NULL DEFAULT 'ACCOUNT',
  "start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end_at" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_suspensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_suspensions_moderation_action_id_fkey" FOREIGN KEY ("moderation_action_id") REFERENCES "moderation_actions"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "moderation_appeals" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "moderation_action_id" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
  "reviewer_id" INTEGER,
  "reviewer_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "moderation_appeals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "moderation_appeals_moderation_action_id_fkey" FOREIGN KEY ("moderation_action_id") REFERENCES "moderation_actions"("id") ON DELETE CASCADE,
  CONSTRAINT "moderation_appeals_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "moderation_audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "actor_id" INTEGER NOT NULL,
  "action_id" INTEGER,
  "event_type" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "moderation_audit_logs_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "moderation_actions"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "moderation_cases_status_priority_score_last_reported_at_idx" ON "moderation_cases" ("status", "priority_score", "last_reported_at");
CREATE INDEX IF NOT EXISTS "moderation_cases_last_reported_at_idx" ON "moderation_cases" ("last_reported_at");
CREATE INDEX IF NOT EXISTS "reports_case_id_created_at_idx" ON "reports" ("case_id", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_actions_case_id_created_at_idx" ON "moderation_actions" ("case_id", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_actions_target_user_id_created_at_idx" ON "moderation_actions" ("target_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_actions_action_type_created_at_idx" ON "moderation_actions" ("action_type", "created_at");
CREATE INDEX IF NOT EXISTS "user_warnings_user_id_created_at_idx" ON "user_warnings" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "user_suspensions_user_id_active_end_at_idx" ON "user_suspensions" ("user_id", "active", "end_at");
CREATE INDEX IF NOT EXISTS "user_suspensions_type_active_end_at_idx" ON "user_suspensions" ("type", "active", "end_at");
CREATE INDEX IF NOT EXISTS "moderation_appeals_status_created_at_idx" ON "moderation_appeals" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_appeals_user_id_created_at_idx" ON "moderation_appeals" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_audit_logs_actor_id_created_at_idx" ON "moderation_audit_logs" ("actor_id", "created_at");
CREATE INDEX IF NOT EXISTS "moderation_audit_logs_event_type_created_at_idx" ON "moderation_audit_logs" ("event_type", "created_at");
