"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  roles: string[];
};

const navItems: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", roles: ["admin", "teacher", "student"] },
  { label: "生徒管理", href: "/students", roles: ["admin", "teacher"] },
  { label: "講師管理", href: "/teachers", roles: ["admin"] },
  { label: "学習進捗", href: "/progress", roles: ["admin", "teacher", "student"] },
  { label: "学習スケジュール", href: "/study-schedule", roles: ["student"] },
  { label: "ゼミ管理", href: "/seminar", roles: ["admin", "teacher", "student"] },
  { label: "タスク管理", href: "/tasks", roles: ["admin", "teacher"] },
  { label: "面談管理", href: "/meetings", roles: ["admin", "teacher"] },
  { label: "イベント管理", href: "/events", roles: ["admin", "teacher"] },
  { label: "自習室管理", href: "/study-room", roles: ["admin", "teacher"] },
  { label: "校舎管理", href: "/campuses", roles: ["admin", "teacher"] },
  { label: "イントロダクション", href: "/articles", roles: ["admin", "teacher", "student"] },
  { label: "ブログ", href: "/blog", roles: ["admin", "teacher", "student"] },
  { label: "出退勤管理", href: "/attendance", roles: ["admin"] },
  { label: "アラート", href: "/alerts", roles: ["admin", "teacher", "student"] },
  { label: "シフト管理", href: "/shifts", roles: ["admin", "teacher"] },
];

type BadgeCounts = {
  unreadAlerts: number;
  unreadArticles: number;
  unreadBlog: number;
  studentAlertCount: number;
};

export default function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<BadgeCounts>({
    unreadAlerts: 0,
    unreadArticles: 0,
    unreadBlog: 0,
    studentAlertCount: 0,
  });

  // ページ遷移時にメニューを閉じる
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // バッジ情報を一括取得
  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const [sidebarRes, alertRes] = await Promise.all([
          fetch("/api/sidebar-counts"),
          userRole !== "student" ? fetch("/api/students/alert-count") : null,
        ]);
        if (cancelled) return;
        if (sidebarRes.ok) {
          const data = await sidebarRes.json();
          setBadges((prev) => ({
            ...prev,
            unreadAlerts: data.unreadAlerts || 0,
            unreadArticles: data.unreadArticles || 0,
            unreadBlog: data.unreadBlog || 0,
          }));
        }
        if (alertRes?.ok) {
          const data = await alertRes.json();
          if (!cancelled) setBadges((prev) => ({ ...prev, studentAlertCount: data.count || 0 }));
        }
      } catch {}
    };
    fetchCounts();
    const id = setInterval(fetchCounts, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [userRole, pathname]);

  const roleLabel = userRole === "admin" ? "管理者" : userRole === "teacher" ? "講師" : "生徒";

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    signOut({ callbackUrl: "/login" });
  };

  const getBadge = (href: string): number => {
    switch (href) {
      case "/students": return badges.studentAlertCount;
      case "/articles": return badges.unreadArticles;
      case "/blog": return badges.unreadBlog;
      case "/alerts": return badges.unreadAlerts;
      default: return 0;
    }
  };

  const sidebarBg = { background: "linear-gradient(to bottom, #020381, #32373c)" };

  return (
    <>
      {/* モバイル用ヘッダーバー */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 text-white shadow"
        style={sidebarBg}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 -ml-1.5 rounded hover:bg-white/10"
          aria-label="メニューを開く"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-base font-bold">Next infra</h1>
        <div className="w-8" />
      </header>

      {/* モバイル: 背景オーバーレイ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={`fixed md:sticky md:top-0 left-0 top-0 h-screen w-64 text-white flex flex-col z-50 transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={sidebarBg}
      >
        <div className="p-4 border-b border-white/20 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Next infra</h1>
            <p className="text-sm text-white/60 mt-1">
              {userName} ({roleLabel})
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded hover:bg-white/10"
            aria-label="メニューを閉じる"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.roles.includes(userRole))
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const badgeCount = getBadge(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-white font-medium"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>
        <div className="p-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white rounded-md transition-colors disabled:opacity-50"
          >
            {loggingOut ? "処理中..." : "ログアウト"}
          </button>
        </div>
      </aside>
    </>
  );
}
