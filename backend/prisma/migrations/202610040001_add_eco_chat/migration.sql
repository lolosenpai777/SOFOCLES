CREATE TABLE "eco_profiles" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "alias" TEXT NOT NULL,
  "mascara" TEXT NOT NULL,
  "gender_declared" TEXT NOT NULL,
  "gender_confirmed" BOOLEAN NOT NULL DEFAULT false,
  "age_status" TEXT NOT NULL DEFAULT 'PENDING',
  "age_document_url" TEXT,
  "age_verification_deadline" TIMESTAMP(3) NOT NULL,
  "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tour_completed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eco_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eco_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eco_profiles_user_id_key" ON "eco_profiles"("user_id");

CREATE TABLE "eco_conversations" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "resonance" INTEGER NOT NULL DEFAULT 0,
  "compatibility" INTEGER NOT NULL DEFAULT 50,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eco_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eco_participants" (
  "conversation_id" TEXT NOT NULL,
  "profile_id" INTEGER NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eco_participants_pkey" PRIMARY KEY ("conversation_id", "profile_id"),
  CONSTRAINT "eco_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "eco_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "eco_participants_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "eco_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "eco_participants_profile_id_idx" ON "eco_participants"("profile_id");

CREATE TABLE "eco_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "author_profile_id" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "attachment_url" TEXT,
  "quoted_message_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eco_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eco_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "eco_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "eco_messages_author_profile_id_fkey" FOREIGN KEY ("author_profile_id") REFERENCES "eco_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "eco_messages_quoted_message_id_fkey" FOREIGN KEY ("quoted_message_id") REFERENCES "eco_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "eco_messages_conversation_id_created_at_idx" ON "eco_messages"("conversation_id", "created_at");

CREATE TABLE "eco_reactions" (
  "id" SERIAL NOT NULL,
  "message_id" TEXT NOT NULL,
  "profile_id" INTEGER NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eco_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eco_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "eco_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eco_reactions_message_id_profile_id_emoji_key" ON "eco_reactions"("message_id", "profile_id", "emoji");
