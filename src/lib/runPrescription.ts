export type RunPrescription = {
  label: "easy" | "race" | "threshold" | "interval";
  paceMsPerKm: number;
  purpose: string;
};

export type RunPrescriptionInput = {
  targetTimeMs: number;
  run1kmPrMs?: number;
};

const HYROX_RUN_SHARE = 0.46;
const HYROX_RUNS = 8;

export function formatPace(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function parseClockTime(timeStr: string): number {
  const parts = timeStr.split(":");
  let hours = 0, mins = 0, secs = 0;
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10) || 0;
    mins = parseInt(parts[1], 10) || 0;
    secs = parseInt(parts[2], 10) || 0;
  } else if (parts.length === 2) {
    mins = parseInt(parts[0], 10) || 0;
    secs = parseInt(parts[1], 10) || 0;
  }
  return (hours * 3600 + mins * 60 + secs) * 1000;
}

export function deriveRaceRunPace(targetTimeMs: number): number {
  return Math.floor((targetTimeMs * HYROX_RUN_SHARE) / HYROX_RUNS);
}

function clampPace(ms: number, minMs: number, maxMs: number): number {
  return Math.max(minMs, Math.min(maxMs, Math.round(ms)));
}

export function deriveRunPrescriptions(input: RunPrescriptionInput): RunPrescription[] {
  const racePace = deriveRaceRunPace(input.targetTimeMs);
  const pr = input.run1kmPrMs && input.run1kmPrMs > 0 ? input.run1kmPrMs : undefined;

  const intervalPace = pr
    ? clampPace(Math.max(pr * 1.04, racePace * 0.88), 150000, racePace)
    : Math.round(racePace * 0.9);

  const thresholdPace = pr
    ? clampPace(Math.min(pr * 1.08, racePace * 0.97), intervalPace, racePace)
    : Math.round(racePace * 0.96);

  return [
    {
      label: "easy",
      paceMsPerKm: Math.round(racePace * 1.22),
      purpose: "Aerobic base, recovery, and durable weekly mileage.",
    },
    {
      label: "race",
      paceMsPerKm: racePace,
      purpose: "Target compromised HYROX 1km pace between stations.",
    },
    {
      label: "threshold",
      paceMsPerKm: thresholdPace,
      purpose: "Controlled hard running to raise sustainable speed.",
    },
    {
      label: "interval",
      paceMsPerKm: intervalPace,
      purpose: "Fast repeats for speed reserve and running economy.",
    },
  ];
}
