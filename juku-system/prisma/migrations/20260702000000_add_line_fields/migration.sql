-- LINE Messaging API linkage fields on users
ALTER TABLE "users" ADD COLUMN "line_user_id" TEXT;
ALTER TABLE "users" ADD COLUMN "line_link_code" TEXT;
ALTER TABLE "users" ADD COLUMN "line_link_expires" TIMESTAMP(3);

-- Unique linked LINE user (Postgres allows multiple NULLs)
CREATE UNIQUE INDEX "users_line_user_id_key" ON "users"("line_user_id");
