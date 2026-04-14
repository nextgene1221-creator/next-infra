-- AlterTable
ALTER TABLE "study_room_sessions" ADD COLUMN     "seat_type" TEXT NOT NULL DEFAULT 'booth';

-- CreateTable
CREATE TABLE "study_room_configs" (
    "id" TEXT NOT NULL,
    "campus" TEXT NOT NULL,
    "booth_capacity" INTEGER NOT NULL DEFAULT 10,
    "table_capacity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_room_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "study_room_configs_campus_key" ON "study_room_configs"("campus");
