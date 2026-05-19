import type { DailyLog } from "@/store/useTrainingStore";

export type MetricsSummary = {
  completedSessions: number;
  completionRate: number;
  streak: number;
  weeklyLoad: Array<{ week: string; load: number }>;
  readinessTrend: Array<{ date: string; rpe: number }>;
  painNoteCount: number;
};

function weekKey(date: string): string {
  return date.slice(0, 7);
}

function hasPainNote(log: DailyLog): boolean {
  return Object.values(log.blockLogs || {}).some((block) => /pain|ache|injury|疼|痛|伤|胸闷|头晕/i.test(block.notes || ""));
}

export function summarizeMetrics(logs: Record<string, DailyLog>, scheduledCount = 0): MetricsSummary {
  const entries = Object.values(logs).sort((a, b) => a.date.localeCompare(b.date));
  const weeklyMap = new Map<string, number>();
  for (const log of entries) {
    const key = weekKey(log.date);
    weeklyMap.set(key, (weeklyMap.get(key) || 0) + (log.rpe || 5) * Math.max(1, log.totalTimeMs / 60000));
  }

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const completedDates = new Set(entries.map((item) => item.date));
  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    completedSessions: entries.length,
    completionRate: scheduledCount > 0 ? Math.round((entries.length / scheduledCount) * 100) : entries.length > 0 ? 100 : 0,
    streak,
    weeklyLoad: Array.from(weeklyMap.entries()).map(([week, load]) => ({ week, load: Math.round(load) })),
    readinessTrend: entries.filter((item) => typeof item.rpe === "number").map((item) => ({ date: item.date, rpe: item.rpe || 0 })),
    painNoteCount: entries.filter(hasPainNote).length,
  };
}
