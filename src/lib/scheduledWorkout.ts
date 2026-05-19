import type { TrainingDay } from "./trainingPlan.ts";

export type ScheduledWorkoutSource = "ai" | "library" | "manual" | "legacy";

export type ScheduledWorkoutRecord = {
  id: string;
  date: string;
  source: ScheduledWorkoutSource;
  isCompleted: boolean;
  isSubstituted: boolean;
  workout: TrainingDay;
  weekIndex?: number;
};

export function scheduledWorkoutFromDay(
  workout: TrainingDay,
  source: ScheduledWorkoutSource,
  id = `${source}-${workout.date}-${Date.now()}`
): ScheduledWorkoutRecord {
  return {
    id,
    date: workout.date,
    source,
    isCompleted: false,
    isSubstituted: (workout.planAdjustments || []).some((item) => /substitution|替代/i.test(item)),
    workout,
  };
}

export function scheduledWorkoutsFromMicrocycle(
  microcycle: Record<string, TrainingDay>,
  source: ScheduledWorkoutSource = "legacy"
): ScheduledWorkoutRecord[] {
  return Object.values(microcycle)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((workout) => scheduledWorkoutFromDay(workout, source, `${source}-${workout.date}`));
}
