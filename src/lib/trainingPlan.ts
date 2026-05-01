export type WodBlockType = "WarmUp" | "MainSet" | "CoolDown" | "Strength" | "Relax";

export type WodBlockFormat =
  | "For Time"
  | "EMOM"
  | "AMRAP"
  | "Rounds"
  | "ROUNDS"
  | "Sets"
  | "Relax"
  | "Intervals";

export type TrainingBlock = {
  type: WodBlockType;
  name: string;
  format: WodBlockFormat;
  details: string[];
  targetDuration?: number;
};

export type TrainingDay = {
  date: string;
  isRestDay: boolean;
  phase: string;
  title: string;
  description: string;
  blocks: TrainingBlock[];
};

export type TrainingPlanRecord = Record<string, TrainingDay>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DEFAULT_BLOCK_TYPE: WodBlockType = "MainSet";
const DEFAULT_BLOCK_FORMAT: WodBlockFormat = "Rounds";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asDetails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeTrainingBlock(value: unknown): TrainingBlock | null {
  if (!isRecord(value)) return null;

  const details = asDetails(value.details);
  const targetDuration =
    typeof value.targetDuration === "number" && Number.isFinite(value.targetDuration)
      ? Math.max(0, Math.round(value.targetDuration))
      : undefined;

  return {
    type: asString(value.type, DEFAULT_BLOCK_TYPE) as WodBlockType,
    name: asString(value.name, "Training Block"),
    format: asString(value.format, DEFAULT_BLOCK_FORMAT) as WodBlockFormat,
    details,
    ...(targetDuration !== undefined ? { targetDuration } : {}),
  };
}

export function normalizeTrainingDay(value: unknown): TrainingDay | null {
  if (!isRecord(value)) return null;

  const date = asString(value.date, "");
  if (!DATE_RE.test(date)) return null;

  const blocks = Array.isArray(value.blocks)
    ? value.blocks.map(normalizeTrainingBlock).filter((block): block is TrainingBlock => block !== null)
    : [];

  return {
    date,
    isRestDay: asBoolean(value.isRestDay),
    phase: asString(value.phase, "Training Phase"),
    title: asString(value.title, "Training Day"),
    description: asString(value.description, ""),
    blocks,
  };
}

export function normalizeTrainingPlan(input: unknown): TrainingPlanRecord {
  let source = input;

  if (isRecord(source) && typeof source.data === "string") {
    try {
      source = JSON.parse(source.data);
    } catch {
      source = [];
    }
  }

  const days = Array.isArray(source)
    ? source
    : isRecord(source)
      ? Object.values(source)
      : [];

  return days.reduce<TrainingPlanRecord>((acc, value) => {
    const day = normalizeTrainingDay(value);
    if (day) acc[day.date] = day;
    return acc;
  }, {});
}

export function normalizeTrainingPlanArray(input: unknown): TrainingDay[] {
  return Object.values(normalizeTrainingPlan(input)).sort((a, b) => a.date.localeCompare(b.date));
}

export function assertSevenDayPlan(input: unknown): TrainingDay[] {
  const days = normalizeTrainingPlanArray(input);
  if (days.length !== 7) {
    throw new Error(`Expected exactly 7 training days, received ${days.length}`);
  }
  return days;
}
