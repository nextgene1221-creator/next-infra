"use client";

import { useState } from "react";
import MaterialsManager, { type MaterialView } from "./MaterialsManager";
import MaterialRoutesManager, { type RouteView, type RouteMaterial } from "./MaterialRoutesManager";

// 教材マスタ画面のタブ切り替え（新規依頼 B-6 で「参考書ルート」を追加）。
export default function MaterialsTabs({
  isAdmin,
  materials,
  routes,
  routeMaterials,
}: {
  isAdmin: boolean;
  materials: MaterialView[];
  routes: RouteView[];
  routeMaterials: RouteMaterial[];
}) {
  const [tab, setTab] = useState<"materials" | "routes">("materials");

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      active ? "border-primary text-primary" : "border-transparent text-dark/60 hover:text-dark"
    }`;

  return (
    <div>
      <div className="flex gap-2 border-b border-gray-200 mb-4">
        <button className={tabCls(tab === "materials")} onClick={() => setTab("materials")}>
          教材一覧
        </button>
        <button className={tabCls(tab === "routes")} onClick={() => setTab("routes")}>
          参考書ルート
        </button>
      </div>

      {tab === "materials" ? (
        <>
          <p className="text-sm text-dark/60 mb-4">
            進捗・学習目標・面談記録で選択する教材を登録します。無効化した教材は新規選択肢から除外されますが、既存の記録はそのまま残ります。
          </p>
          <MaterialsManager isAdmin={isAdmin} initialMaterials={materials} />
        </>
      ) : (
        <>
          <p className="text-sm text-dark/60 mb-4">
            参考書を学習順に並べた「ルート」をテンプレートとして登録します。既存ルートを<strong>複製</strong>して派生版を作れます。
            学習の段階は上からの並び順で表します。<br />
            ※ このタブはルートの雛形を管理するだけで、生徒への割り当てや学習目標・進捗との連携は行いません。
          </p>
          <MaterialRoutesManager isAdmin={isAdmin} initialRoutes={routes} materials={routeMaterials} />
        </>
      )}
    </div>
  );
}
