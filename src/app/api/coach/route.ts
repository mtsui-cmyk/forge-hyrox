import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildLongTermPlan, buildWeekFromLongTermPlan } from "@/lib/longTermPlan";
import { createDemoMicrocycle, todayDateString } from "@/lib/demoData";
import { BUILT_IN_WORKOUT_TEMPLATES, templateToTrainingDay } from "@/lib/workoutLibrary";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const type = body.type || "week";
    const profile = body.profile || {};
    const startDate = body.startDate || todayDateString();

    if (type === "long-term") {
      return NextResponse.json({
        plan: buildLongTermPlan({
          startDate,
          raceDate: profile.nextRaceDate || body.raceDate || startDate,
          targetTime: profile.targetTime || "01:15:00",
          fitnessLevel: profile.fitnessLevel || "Intermediate",
          weeks: body.weeks || 8,
        }),
        generation: { generationType: "long-term", status: "fallback_ok", fallbackUsed: true },
      });
    }

    if (type === "single") {
      const template = BUILT_IN_WORKOUT_TEMPLATES.find((item) => item.focus === (body.focus || "Engine")) || BUILT_IN_WORKOUT_TEMPLATES[0];
      return NextResponse.json({
        workout: templateToTrainingDay({ ...template, id: `coach-${Date.now()}`, title: `Coach: ${template.title}` }, startDate),
        generation: { generationType: "single", status: "fallback_ok", fallbackUsed: true },
      });
    }

    const plan = body.plan || buildLongTermPlan({
      startDate,
      raceDate: profile.nextRaceDate || startDate,
      targetTime: profile.targetTime || "01:15:00",
      fitnessLevel: profile.fitnessLevel || "Intermediate",
      weeks: 8,
    });
    return NextResponse.json({
      week: buildWeekFromLongTermPlan({
        plan,
        weekIndex: body.weekIndex || 0,
        completedLogs: body.completedLogs || {},
        baseWeek: createDemoMicrocycle(startDate, body.lang === "zh" ? "zh" : "en"),
      }),
      generation: { generationType: "week", status: "fallback_ok", fallbackUsed: true },
    });
  } catch {
    return NextResponse.json({ error: "Coach generation failed" }, { status: 500 });
  }
}
