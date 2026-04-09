-- ProgressRecord: drop topic, understanding_level, comment; add material, pages_completed, goal_id
CREATE TABLE "progress_records_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "material" TEXT NOT NULL DEFAULT '',
    "pages_completed" INTEGER NOT NULL DEFAULT 0,
    "goal_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "progress_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "progress_records_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "progress_records_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "learning_goals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "progress_records_new" ("id", "student_id", "teacher_id", "subject", "date", "material", "pages_completed", "created_at", "updated_at")
  SELECT "id", "student_id", "teacher_id", "subject", "date", COALESCE("topic", ''), 0, "created_at", "updated_at" FROM "progress_records";
DROP TABLE "progress_records";
ALTER TABLE "progress_records_new" RENAME TO "progress_records";

-- LearningGoal: rename total_pages -> target_pages, drop current_page, add subject
CREATE TABLE "learning_goals_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "material_name" TEXT NOT NULL,
    "target_pages" INTEGER NOT NULL,
    "due_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "learning_goals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "learning_goals_new" ("id", "student_id", "subject", "material_name", "target_pages", "due_date", "status", "notes", "created_at", "updated_at")
  SELECT "id", "student_id", '', "material_name", "total_pages", "due_date", "status", "notes", "created_at", "updated_at" FROM "learning_goals";
DROP TABLE "learning_goals";
ALTER TABLE "learning_goals_new" RENAME TO "learning_goals";
