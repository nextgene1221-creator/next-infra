"use client";

import { useState } from "react";
import AttendanceEditModal from "./AttendanceEditModal";

export default function AttendanceEditButton({
  attendanceId,
  teacherName,
  initialClockIn,
  initialClockOut,
  initialCampus = "",
  campuses = [],
  allowDelete = false,
  label = "修正",
  className,
}: {
  attendanceId: string;
  teacherName?: string;
  initialClockIn: string;
  initialClockOut: string | null;
  initialCampus?: string;
  campuses?: { code: string; label: string }[];
  allowDelete?: boolean;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={className ?? "text-xs text-primary hover:underline"}
      >
        {label}
      </button>
      {open && (
        <AttendanceEditModal
          attendanceId={attendanceId}
          teacherName={teacherName}
          initialClockIn={initialClockIn}
          initialClockOut={initialClockOut}
          initialCampus={initialCampus}
          campuses={campuses}
          allowDelete={allowDelete}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
