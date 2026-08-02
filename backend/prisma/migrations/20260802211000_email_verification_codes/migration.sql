-- CreateEnum
CREATE TYPE "EmailVerificationTokenType" AS ENUM ('LINK', 'CODE');

-- Existing opaque-link tokens remain LINK during the transition.
ALTER TABLE "email_verification_tokens"
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMP(3),
  ADD COLUMN "sent_at" TIMESTAMP(3),
  ADD COLUMN "sent_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sent_day" TIMESTAMP(3),
  ADD COLUMN "token_type" "EmailVerificationTokenType" NOT NULL DEFAULT 'LINK';

-- New records use CODE; old rows keep the LINK value assigned above.
ALTER TABLE "email_verification_tokens"
  ALTER COLUMN "token_type" SET DEFAULT 'CODE';

ALTER TABLE "users"
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users"
SET "email_verified" = ("email_verified_at" IS NOT NULL);
