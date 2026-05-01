import { getMissingEquipment, type EquipmentAvailability } from "./equipmentSubstitutions.ts";
import { normalizeTrainingPlanArray, type TrainingDay } from "./trainingPlan.ts";

export type CoachGuardrailIssue = {
  code:
    | "seven_day_microcycle"
    | "rest_day_count"
    | "missing_running_sessions"
    | "empty_training_day"
    | "unavailable_equipment";
  message: string;
  date?: string;
};

export type CoachGuardrailOptions = {
  equipment?: Partial<EquipmentAvailability>;
};

const RUN_RE = /\b(run|running|treadmill|jog|sprint|interval|tempo|threshold)\b|跑步|慢跑|冲刺|间歇|配速|有氧跑|公里|km/iu;

function sessionHasRunPrescription(day: TrainingDay): boolean {
  if (day.isRestDay) return false;
  const text = [
    day.title,
    day.description,
    ...day.blocks.flatMap((block) => [block.name, block.type, block.format, ...block.details]),
  ].join(" ");
  return RUN_RE.test(text);
}

export function validateCoachReadyMicrocycle(
  input: unknown,
  options: CoachGuardrailOptions = {}
): { days: TrainingDay[]; issues: CoachGuardrailIssue[] } {
  const days = normalizeTrainingPlanArray(input);
  const issues: CoachGuardrailIssue[] = [];

  if (days.length !== 7) {
    issues.push({
      code: "seven_day_microcycle",
      message: `Expected exactly 7 sessions in the microcycle, received ${days.length}.`,
    });
  }

  const restDays = days.filter((day) => day.isRestDay);
  if (restDays.length !== 1) {
    issues.push({
      code: "rest_day_count",
      message: `Expected exactly one rest day, received ${restDays.length}.`,
    });
  }

  const runSessions = days.filter(sessionHasRunPrescription);
  if (runSessions.length < 2) {
    issues.push({
      code: "missing_running_sessions",
      message: `Expected at least two running sessions, received ${runSessions.length}.`,
    });
  }

  for (const day of days) {
    if (!day.isRestDay && day.blocks.length === 0) {
      issues.push({
        code: "empty_training_day",
        date: day.date,
        message: `Non-rest session ${day.date} has no workout blocks.`,
      });
    }

    if (options.equipment) {
      for (const block of day.blocks) {
        const missing = getMissingEquipment(block, options.equipment);
        if (missing.length > 0) {
          issues.push({
            code: "unavailable_equipment",
            date: day.date,
            message: `Session ${day.date} requires unavailable equipment: ${missing.join(", ")}.`,
          });
        }
      }
    }
  }

  return { days, issues };
}

export function assertCoachReadyMicrocycle(
  input: unknown,
  options: CoachGuardrailOptions = {}
): TrainingDay[] {
  const result = validateCoachReadyMicrocycle(input, options);
  if (result.issues.length > 0) {
    throw new Error(result.issues.map((issue) => `${issue.code}: ${issue.message}`).join(" | "));
  }
  return result.days;
}
