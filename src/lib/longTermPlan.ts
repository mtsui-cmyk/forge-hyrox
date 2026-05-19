import { addDays, format } from "date-fns";
import { summarizeReadiness } from "./readiness.ts";
import type { TrainingDay } from "./trainingPlan.ts";

export type TrainingPhase = "Base" | "Build" | "Peak" | "Taper" | "Race";

export type LongTermWeek = {
  weekIndex: number;
  startDate: string;
  phase: TrainingPhase;
  focus: string;
  volumeTarget: number;
  planAdjustments: string[];
};

export type LongTermPlan = {
  title: string;
  startDate: string;
  endDate: string;
  raceDate: string;
  goal: string;
  planLevel: string;
  currentWeekIndex: number;
  weeks: LongTermWeek[];
};

function phaseForWeek(index: number, totalWeeks: number): TrainingPhase {
  if (index >= totalWeeks - 1) return "Taper";
  if (index >= totalWeeks - 2) return "Peak";
  if (index >= Math.ceil(totalWeeks * 0.45)) return "Build";
  return "Base";
}

function volumeForPhase(phase: TrainingPhase, index: number): number {
  if ((index + 1) % 4 === 0 && phase !== "Taper") return 75;
  if (phase === "Base") return 85;
  if (phase === "Build") return 95;
  if (phase === "Peak") return 100;
  return 60;
}

export function buildLongTermPlan(input: {
  startDate: string;
  raceDate: string;
  targetTime: string;
  fitnessLevel: string;
  weeks?: number;
}): LongTermPlan {
  const weeks = Math.min(8, Math.max(4, input.weeks || 8));
  const start = new Date(`${input.startDate}T00:00:00`);
  const end = addDays(start, weeks * 7 - 1);

  return {
    title: `${weeks}-Week HYROX ${input.fitnessLevel || "Intermediate"} Build`,
    startDate: input.startDate,
    endDate: format(end, "yyyy-MM-dd"),
    raceDate: input.raceDate,
    goal: input.targetTime,
    planLevel: input.fitnessLevel || "Intermediate",
    currentWeekIndex: 0,
    weeks: Array.from({ length: weeks }, (_, index) => {
      const phase = phaseForWeek(index, weeks);
      const startDate = format(addDays(start, index * 7), "yyyy-MM-dd");
      const isDeload = (index + 1) % 4 === 0 && phase !== "Taper";
      return {
        weekIndex: index,
        startDate,
        phase,
        focus:
          phase === "Base" ? "Aerobic base and movement quality" :
          phase === "Build" ? "Compromised running and station strength" :
          phase === "Peak" ? "Race simulation and specificity" :
          "Freshness, rhythm, and race pace",
        volumeTarget: volumeForPhase(phase, index),
        planAdjustments: [
          isDeload ? "Deload week: volume reduced to absorb the previous training block." : `${phase} week: volume target follows the long-term race progression.`,
          phase === "Taper" ? "Race is close, so volume is reduced while short race-pace touches remain." : "Running exposure and HYROX station work remain balanced.",
        ],
      };
    }),
  };
}

export function validateLongTermPlan(plan: LongTermPlan): string[] {
  const issues: string[] = [];
  if (plan.weeks.length < 4 || plan.weeks.length > 8) issues.push("Plan must be 4-8 weeks.");
  if (!plan.weeks.some((week) => week.phase === "Taper")) issues.push("Plan must include taper phase.");
  if (!plan.weeks.some((week) => week.volumeTarget <= 75)) issues.push("Plan must include a deload or taper reduction.");
  return issues;
}

export function buildWeekFromLongTermPlan(input: {
  plan: LongTermPlan;
  weekIndex: number;
  completedLogs?: Record<string, unknown>;
  baseWeek: TrainingDay[];
}): TrainingDay[] {
  const week = input.plan.weeks[input.weekIndex] || input.plan.weeks[0];
  const readiness = summarizeReadiness(input.completedLogs as any, week.startDate);
  const volume = Math.round(week.volumeTarget * readiness.volumeMultiplier);
  return input.baseWeek.map((day) => ({
    ...day,
    phase: week.phase,
    planAdjustments: [
      ...week.planAdjustments,
      `Long-term volume target for this week is ${volume}%.`,
      readiness.level !== "green" ? `Readiness is ${readiness.level}; training load is adjusted before scheduling.` : "Readiness is green; progression can continue.",
    ],
    coachNotes: [
      ...(day.coachNotes || []),
      `This session is scheduled inside week ${week.weekIndex + 1}: ${week.focus}.`,
    ],
  }));
}
