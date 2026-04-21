-- Meeting: add snapshot fields for goals and progress at time of meeting
ALTER TABLE "meetings" ADD COLUMN "goals_snapshot" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "meetings" ADD COLUMN "progress_snapshot" TEXT NOT NULL DEFAULT '[]';

-- StudyScheduleDay: add slots (JSON array of {subject, minutes})
ALTER TABLE "study_schedule_days" ADD COLUMN "slots" TEXT NOT NULL DEFAULT '[]';
