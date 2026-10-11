CREATE TABLE "identity_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "identity_verifications_user_id_key" ON "identity_verifications"("user_id");

ALTER TABLE "identity_verifications"
ADD CONSTRAINT "identity_verifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
