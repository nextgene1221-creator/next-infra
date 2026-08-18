-- 参考書ルート（新規依頼 B-6）。参考書を学習順に並べたテンプレート。
-- 追加のみ・既存データ非破壊。既存の教材(materials)は参照するだけで変更しない。

CREATE TABLE "material_routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "target_level" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_routes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "material_routes_subject_idx" ON "material_routes"("subject");
CREATE INDEX "material_routes_active_idx" ON "material_routes"("active");

CREATE TABLE "material_route_items" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_route_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "material_route_items_route_id_idx" ON "material_route_items"("route_id");
CREATE INDEX "material_route_items_material_id_idx" ON "material_route_items"("material_id");

ALTER TABLE "material_route_items" ADD CONSTRAINT "material_route_items_route_id_fkey"
    FOREIGN KEY ("route_id") REFERENCES "material_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_route_items" ADD CONSTRAINT "material_route_items_material_id_fkey"
    FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
