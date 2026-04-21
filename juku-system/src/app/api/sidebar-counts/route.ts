import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role = session.user.role;

  // 未読アラート数
  const unreadAlerts = await prisma.alert.count({
    where: { userId, isRead: false },
  });

  // 未読イントロダクション数
  const audienceFilter = role === "admin" ? undefined : { in: [role, "both"] };
  const totalArticles = await prisma.article.count({
    where: audienceFilter ? { audience: audienceFilter } : {},
  });
  const readArticles = await prisma.articleRead.count({
    where: {
      userId,
      article: audienceFilter ? { audience: audienceFilter } : {},
    },
  });
  const unreadArticles = totalArticles - readArticles;

  // 未読ブログ数
  const blogAudienceFilter = role === "admin" ? undefined : { in: [role, "both"] };
  const totalBlog = await prisma.blogPost.count({
    where: blogAudienceFilter ? { audience: blogAudienceFilter } : {},
  });
  const readBlog = await prisma.blogRead.count({
    where: {
      userId,
      post: blogAudienceFilter ? { audience: blogAudienceFilter } : {},
    },
  });
  const unreadBlog = totalBlog - readBlog;

  return NextResponse.json({
    unreadAlerts,
    unreadArticles: Math.max(0, unreadArticles),
    unreadBlog: Math.max(0, unreadBlog),
  });
}
