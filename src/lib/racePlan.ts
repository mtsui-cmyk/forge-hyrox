import { parseClockTime } from "./runPrescription.ts";

export const HYROX_STATIONS = [
  { id: "SkiErg", name: "1000m SkiErg", weight: 0.05 },
  { id: "SledPush", name: "50m Sled Push", weight: 0.055 },
  { id: "SledPull", name: "50m Sled Pull", weight: 0.055 },
  { id: "Burpee", name: "80m Burpee Broad Jumps", weight: 0.065 },
  { id: "Rowing", name: "1000m RowErg", weight: 0.05 },
  { id: "FarmersCarry", name: "200m Farmer Carry", weight: 0.04 },
  { id: "Sandbag", name: "100m Sandbag Lunges", weight: 0.06 },
  { id: "WallBalls", name: "Wall Balls", weight: 0.08 },
] as const;

export type RaceSplit = {
  id: string;
  name: string;
  targetMs: number;
  manual?: boolean;
};

export type RacePlan = {
  title: string;
  targetTimeMs: number;
  division: "Open" | "Pro";
  gender: string;
  eventType: "Individual";
  runSplits: RaceSplit[];
  stationSplits: RaceSplit[];
  roxzoneMs: number;
  projectedTimeMs: number;
};

const RUN_TOTAL_WEIGHT = 0.56;
const ROXZONE_WEIGHT = 0.10;

export function msToClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function distributeRemainder(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function buildRacePlan(input: {
  targetTime: string;
  division?: "Open" | "Pro";
  gender?: string;
  manualStationSplits?: Record<string, number>;
}): RacePlan {
  const targetTimeMs = parseClockTime(input.targetTime);
  const roxzoneMs = Math.round(targetTimeMs * ROXZONE_WEIGHT);
  const manualTotal = Object.values(input.manualStationSplits || {}).reduce((sum, value) => sum + value, 0);
  const stationBudget = Math.round(targetTimeMs * (1 - RUN_TOTAL_WEIGHT - ROXZONE_WEIGHT));
  const autoStationBudget = Math.max(0, stationBudget - manualTotal);
  const autoWeightTotal = HYROX_STATIONS
    .filter((station) => !input.manualStationSplits?.[station.id])
    .reduce((sum, station) => sum + station.weight, 0);

  const stationSplits = HYROX_STATIONS.map((station) => {
    const manual = input.manualStationSplits?.[station.id];
    return {
      id: station.id,
      name: station.name,
      targetMs: manual ?? Math.round(autoStationBudget * (station.weight / autoWeightTotal)),
      manual: manual !== undefined,
    };
  });

  const stationTotal = stationSplits.reduce((sum, item) => sum + item.targetMs, 0);
  const runBudget = Math.max(0, targetTimeMs - roxzoneMs - stationTotal);
  const runTargets = distributeRemainder(runBudget, 8);
  const runSplits = runTargets.map((targetMs, index) => ({
    id: `Run${index + 1}`,
    name: `Run ${index + 1}`,
    targetMs,
  }));

  return {
    title: `${input.targetTime} HYROX Race Plan`,
    targetTimeMs,
    division: input.division || "Open",
    gender: input.gender || "Unknown",
    eventType: "Individual",
    runSplits,
    stationSplits,
    roxzoneMs,
    projectedTimeMs: runBudget + stationTotal + roxzoneMs,
  };
}
