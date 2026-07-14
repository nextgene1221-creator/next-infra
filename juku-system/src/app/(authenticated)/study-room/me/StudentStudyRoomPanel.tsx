"use client";

import { useState } from "react";
import CheckInForm from "../check-in/CheckInForm";
import InRoomActions from "../check-in/InRoomActions";

type CampusAvail = {
  code: string;
  label: string;
  closeTime: string;
  boothAvail: number;
  tableAvail: number;
};

type OpenSession = {
  campus: string;
  campusLabel: string;
  seatType: "booth" | "table";
};

export default function StudentStudyRoomPanel({
  open,
  campuses,
}: {
  open: OpenSession | null;
  campuses: CampusAvail[];
}) {
  const [selected, setSelected] = useState<string>(campuses[0]?.code ?? "");

  // 入室中：席移動・退室（既存 InRoomActions を再利用）
  if (open) {
    const cur = campuses.find((c) => c.code === open.campus);
    return (
      <div>
        <p className="text-sm text-dark/70 mb-3">
          <span className="font-semibold text-dark">{open.campusLabel}</span> に入室中です
        </p>
        <InRoomActions
          campus={open.campus}
          campusLabel={open.campusLabel}
          currentSeatType={open.seatType}
          boothAvailable={cur?.boothAvail ?? 0}
          tableAvailable={cur?.tableAvail ?? 0}
        />
      </div>
    );
  }

  // 未入室：校舎を選んで入室（既存 CheckInForm を再利用）
  if (campuses.length === 0) {
    return <p className="text-sm text-dark/60">利用可能な校舎がありません。運営にお問い合わせください。</p>;
  }
  const sel = campuses.find((c) => c.code === selected) ?? campuses[0];

  return (
    <div>
      <p className="text-sm text-dark/70 mb-2">校舎を選択</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {campuses.map((c) => {
          const active = sel.code === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelected(c.code)}
              className={`p-3 rounded-md border text-sm ${
                active
                  ? "border-primary bg-primary-light text-primary font-semibold"
                  : "border-gray-300 bg-white text-dark/70"
              }`}
            >
              <div>{c.label}</div>
              <div className="text-xs mt-0.5 text-dark/50">自動退室 {c.closeTime}</div>
            </button>
          );
        })}
      </div>
      <CheckInForm
        key={sel.code}
        campus={sel.code}
        boothAvailable={sel.boothAvail}
        tableAvailable={sel.tableAvail}
      />
    </div>
  );
}
