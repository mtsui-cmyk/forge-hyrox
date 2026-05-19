import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildLongTermPlan, buildWeekFromLongTermPlan } from "@/lib/longTermPlan";
import { createDemoMicrocycle, todayDateString } from "@/lib/demoData";
import prisma from "@/lib/prisma";
import { summarizeReadiness } from "@/lib/readiness";
import { scheduledWorkoutFromDay } from "@/lib/scheduledWorkout";
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
      const plan = buildLongTermPlan({
        startDate,
        raceDate: profile.nextRaceDate || body.raceDate || startDate,
        targetTime: profile.targetTime || "01:15:00",
        fitnessLevel: profile.fitnessLevel || "Intermediate",
        weeks: body.weeks || 8,
      });
      const persistedPlan = await prisma.trainingPlan.upsert({
        where: { id: body.planId || `active-${session.user.id}` },
        update: {
          title: plan.title,
          startDate: plan.startDate,
          endDate: plan.endDate,
          raceDate: plan.raceDate,
          goal: plan.goal,
          status: "active",
          planLevel: plan.planLevel,
          currentWeekIndex: plan.currentWeekIndex,
        },
        create: {
          id: body.planId || `active-${session.user.id}`,
          userId: session.user.id,
          title: plan.title,
          startDate: plan.startDate,
          endDate: plan.endDate,
          raceDate: plan.raceDate,
          goal: plan.goal,
          status: "active",
          planLevel: plan.planLevel,
          currentWeekIndex: plan.currentWeekIndex,
        },
      });
      for (const week of plan.weeks) {
        await prisma.trainingWeek.upsert({
          where: { planId_weekIndex: { planId: persistedPlan.id, weekIndex: week.weekIndex } },
          update: {
            phase: week.phase,
            startDate: week.startDate,
            focus: week.focus,
            volumeTarget: week.volumeTarget,
            planAdjustments: week.planAdjustments,
          },
          create: {
            planId: persistedPlan.id,
            weekIndex: week.weekIndex,
            startDate: week.startDate,
            phase: week.phase,
            focus: week.focus,
            volumeTarget: week.volumeTarget,
            planAdjustments: week.planAdjustments,
          },
        });
      }
      await prisma.coachGeneration.create({
        data: {
          userId: session.user.id,
          trainingPlanId: persistedPlan.id,
          generationType: "long-term",
          status: "fallback_ok",
          fallbackUsed: true,
          metadata: { weeks: plan.weeks.length, source: "deterministic_coach" },
        },
      });
      return NextResponse.json({
        plan: { ...plan, id: persistedPlan.id },
        generation: { generationType: "long-term", status: "fallback_ok", fallbackUsed: true },
      });
    }

    if (type === "single") {
      const template = BUILT_IN_WORKOUT_TEMPLATES.find((item) => item.focus === (body.focus || "Engine")) || BUILT_IN_WORKOUT_TEMPLATES[0];
      const workout = templateToTrainingDay({ ...template, id: `coach-${Date.now()}`, title: `Coach: ${template.title}` }, startDate);
      await prisma.scheduledWorkout.upsert({
        where: { id: `coach-single-${session.user.id}-${startDate}` },
        update: {
          date: startDate,
          source: "ai",
          workout,
        },
        create: {
          id: `coach-single-${session.user.id}-${startDate}`,
          userId: session.user.id,
          date: startDate,
          source: "ai",
          workout,
        },
      });
      await prisma.coachGeneration.create({
        data: {
          userId: session.user.id,
          generationType: "single",
          status: "fallback_ok",
          fallbackUsed: true,
          metadata: { focus: template.focus, source: "deterministic_coach" },
        },
      });
      return NextResponse.json({
        workout,
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
    const planId = typeof plan.id === "string" ? plan.id : null;
    const weekIndex = body.weekIndex || 0;
    const week = buildWeekFromLongTermPlan({
      plan,
      weekIndex,
      completedLogs: body.completedLogs || {},
      baseWeek: createDemoMicrocycle(startDate, body.lang === "zh" ? "zh" : "en"),
    });
    const readiness = summarizeReadiness(body.completedLogs || {}, plan.weeks?.[weekIndex]?.startDate || startDate);
    const snapshot = await prisma.readinessSnapshot.create({
      data: {
        userId: session.user.id,
        date: plan.weeks?.[weekIndex]?.startDate || startDate,
        level: readiness.level,
        avgRpe: readiness.avgRpe ?? null,
        maxRpe: readiness.maxRpe ?? null,
        completedSessions: readiness.completedSessions,
        painSignals: readiness.painSignals,
        redFlagSignals: readiness.redFlagSignals,
        volumeMultiplier: readiness.volumeMultiplier,
      },
    });
    for (const day of week) {
      const scheduledWorkout = scheduledWorkoutFromDay(day, "ai", `coach-week-${session.user.id}-${day.date}`);
      await prisma.scheduledWorkout.upsert({
        where: { id: scheduledWorkout.id },
        update: {
          date: scheduledWorkout.date,
          source: scheduledWorkout.source,
          isCompleted: scheduledWorkout.isCompleted,
          isSubstituted: scheduledWorkout.isSubstituted,
          workout: scheduledWorkout.workout,
        },
        create: {
          id: scheduledWorkout.id,
          userId: session.user.id,
          date: scheduledWorkout.date,
          source: scheduledWorkout.source,
          isCompleted: scheduledWorkout.isCompleted,
          isSubstituted: scheduledWorkout.isSubstituted,
          workout: scheduledWorkout.workout,
        },
      });
    }
    await prisma.coachGeneration.create({
      data: {
        userId: session.user.id,
        trainingPlanId: planId,
        generationType: "week",
        status: "fallback_ok",
        fallbackUsed: true,
        metadata: { weekIndex, readinessLevel: readiness.level, readinessSnapshotId: snapshot.id },
      },
    });
    return NextResponse.json({
      week,
      readinessSnapshot: snapshot,
      generation: { generationType: "week", status: "fallback_ok", fallbackUsed: true },
    });
  } catch {
    return NextResponse.json({ error: "Coach generation failed" }, { status: 500 });
  }
}
