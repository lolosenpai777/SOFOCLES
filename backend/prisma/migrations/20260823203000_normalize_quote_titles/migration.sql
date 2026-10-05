UPDATE "posts"
SET "title" = COALESCE(NULLIF(regexp_replace("title", '^(Cita: )+', ''), ''), 'Nueva publicación')
WHERE "quoted_post_id" IS NOT NULL;
