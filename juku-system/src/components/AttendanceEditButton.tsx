"use client";

import { useState } from "react";
import AttendanceEditModal from "./AttendanceEditModal";

export default function AttendanceEditButton({
  attendanceId,
  teacherName,
  initialClockIn,
  initialClockOut,
  allowDelete = false,
  label = "修正",
  className,
}: {
  attendanceId: string;
  teacherName?: string;
  initialClockIn: string;
  initialClockOut: string | null;
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
          allowDelete={allowDelete}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
