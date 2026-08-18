// 一時的な生徒サインアップ API（公開、認証不要）。導入完了後に削除する想定。
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeApplicationPolicy, normalizeLocationPreference } from "@/lib/studentPreferences";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, email, graduationYear, schoolName,
    parentName, parentPhone, parentEmail, enrollmentDate, notes,
    furigana, gender, birthDate, mobilePhone, postalCode, address,
    referrer, track, firstChoiceSchool, desiredFaculty, examSubjects,
    considerRecommendation, eikenPlan, campus,
    applicationPolicy, locationPreference,
  } = body;

  if (!name || !email || !graduationYear || !schoolName || !parentName || !parentPhone || !parentEmail || !enrollmentDate) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.student.create({
    data: {
      graduationYear: Number(graduationYear),
      schoolName,
      parentName,
      parentPhone,
      parentEmail,
      enrollmentDate: new Date(enrollmentDate),
      status: "active",
      notes: notes || "",
      furigana: furigana || "",
      gender: gender || "",
      birthDate: birthDate ? new Date(birthDate) : null,
      mobilePhone: mobilePhone || "",
      postalCode: postalCode || "",
      address: address || "",
      referrer: referrer || "",
      track: track || "",
      firstChoiceSchool: firstChoiceSchool || "",
      desiredFaculty: desiredFaculty || "",
      examSubjects: JSON.stringify(Array.isArray(examSubjects) ? examSubjects : []),
      considerRecommendation: !!considerRecommendation,
      eikenPlan: eikenPlan || "",
      campus: campus || "",
      applicationPolicy: normalizeApplicationPolicy(applicationPolicy),
      locationPreference: normalizeLocationPreference(locationPreference),
      user: {
        create: {
          email,
          passwordHash,
          role: "student",
          name,
        },
      },
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
