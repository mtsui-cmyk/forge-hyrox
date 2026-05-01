export type ReadinessLevel = "green" | "yellow" | "red";

export type ReadinessLog = {
  date: string;
  rpe?: number;
  blockLogs?: Record<string | number, { notes?: string }>;
};

export type ReadinessState = {
  level: ReadinessLevel;
  avgRpe?: number;
  maxRpe?: number;
  completedSessions: number;
  painSignals: string[];
  redFlagSignals: string[];
  volumeMultiplier: number;
  recommendation: string;
};

const PAIN_RE = /\b(pain|injury|injured|ache|tendon|knee|ankle|hip|back|shoulder|calf|shin)\b|疼|痛|伤|膝|踝|髋|腰|肩|小腿|跟腱|胫骨/iu;
const RED_FLAG_RE = /\b(chest pain|chest tightness|dizzy|dizziness|faint|fainted|shortness of breath|heart palpitations|numbness|sharp pain|swelling)\b|胸痛|胸闷|头晕|眩晕|昏厥|晕倒|呼吸困难|心悸|麻木|剧痛|肿胀/iu;

function asDateOnly(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return new Date(`${date}T00:00:00`);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 3600 * 24));
}

function collectPainSignals(log: ReadinessLog): string[] {
  const signals: string[] = [];
  for (const block of Object.values(log.blockLogs || {})) {
    const note = block.notes?.trim();
    if (note && PAIN_RE.test(note)) signals.push(note);
  }
  return signals;
}

function collectRedFlagSignals(log: ReadinessLog): string[] {
  const signals: string[] = [];
  for (const block of Object.values(log.blockLogs || {})) {
    const note = block.notes?.trim();
    if (note && RED_FLAG_RE.test(note)) signals.push(note);
  }
  return signals;
}

export function summarizeReadiness(
  completedLogs: Record<string, ReadinessLog> | null | undefined,
  referenceDate: string,
  lookbackDays = 14
): ReadinessState {
  const reference = asDateOnly(referenceDate) || new Date();
  const logs = Object.values(completedLogs || {}).filter((log) => {
    const date = asDateOnly(log.date);
    if (!date) return false;
    const ageDays = daysBetween(reference, date);
    return ageDays > 0 && ageDays <= lookbackDays;
  });

  const rpes = logs
    .map((log) => log.rpe)
    .filter((rpe): rpe is number => typeof rpe === "number" && Number.isFinite(rpe));
  const avgRpe = rpes.length > 0 ? rpes.reduce((sum, rpe) => sum + rpe, 0) / rpes.length : undefined;
  const maxRpe = rpes.length > 0 ? Math.max(...rpes) : undefined;
  const painSignals = logs.flatMap(collectPainSignals).slice(-5);
  const redFlagSignals = logs.flatMap(collectRedFlagSignals).slice(-5);

  let level: ReadinessLevel = "green";
  if (
    redFlagSignals.length > 0 ||
    (avgRpe !== undefined && avgRpe >= 8) ||
    (maxRpe !== undefined && maxRpe >= 9) ||
    painSignals.length >= 2
  ) {
    level = "red";
  } else if ((avgRpe !== undefined && avgRpe >= 7) || painSignals.length === 1 || logs.length >= 6) {
    level = "yellow";
  }

  if (level === "red") {
    return {
      level,
      avgRpe,
      maxRpe,
      completedSessions: logs.length,
      painSignals,
      redFlagSignals,
      volumeMultiplier: redFlagSignals.length > 0 ? 0.5 : 0.65,
      recommendation: redFlagSignals.length > 0
        ? "Stop high-intensity work, avoid loading the flagged area, and consult a qualified professional before pushing again."
        : "Reduce volume, avoid high-impact overload, and prioritize recovery until symptoms settle.",
    };
  }

  if (level === "yellow") {
    return {
      level,
      avgRpe,
      maxRpe,
      completedSessions: logs.length,
      painSignals,
      redFlagSignals,
      volumeMultiplier: 0.85,
      recommendation: "Keep the plan specific, but trim volume and avoid stacking hard run or sled sessions.",
    };
  }

  return {
    level,
    avgRpe,
    maxRpe,
    completedSessions: logs.length,
    painSignals,
    redFlagSignals,
    volumeMultiplier: 1,
    recommendation: "Proceed with normal progressive overload while monitoring RPE and notes.",
  };
}
