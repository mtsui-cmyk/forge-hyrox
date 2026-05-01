import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLocalSubstitution,
  getMissingEquipment,
  getRequiredEquipment,
} from "../src/lib/equipmentSubstitutions.ts";
import {
  deriveRaceRunPace,
  deriveRunPrescriptions,
  formatPace,
  parseClockTime,
} from "../src/lib/runPrescription.ts";
import { validateCoachReadyMicrocycle } from "../src/lib/coachGuardrails.ts";
import { summarizeReadiness } from "../src/lib/readiness.ts";
import type { TrainingBlock, TrainingDay } from "../src/lib/trainingPlan.ts";

const workoutBlock = (details: string[]): TrainingBlock => ({
  type: "MainSet",
  name: "HYROX Combo",
  format: "Rounds",
  details,
  targetDuration: 18,
});

const day = (date: string, blocks: TrainingBlock[], isRestDay = false): TrainingDay => ({
  date,
  isRestDay,
  phase: "Build",
  title: isRestDay ? "Rest" : "Training",
  description: isRestDay ? "Full recovery" : "HYROX work",
  blocks,
});

function validMicrocycle(): TrainingDay[] {
  return [
    day("2026-05-01", [workoutBlock(["Run prescription race: 1km @ 04:19/km", "20 Wall Balls"])]),
    day("2026-05-02", [workoutBlock(["Sled Push 4 x 25m", "Farmer Carry 200m"])]),
    day("2026-05-03", [workoutBlock(["Easy run prescription easy: 45 minutes @ 05:16/km"])]),
    day("2026-05-04", [workoutBlock(["RowErg 5 x 500m", "Burpee broad jumps"])]),
    day("2026-05-05", [workoutBlock(["Strength sets: lunges, carries, core"])]),
    day("2026-05-06", [], true),
    day("2026-05-07", [workoutBlock(["Threshold run prescription threshold: 3 x 2km @ 04:11/km"])]),
  ];
}

test("run prescriptions derive practical paces from target time and 1km PR", () => {
  const targetTimeMs = parseClockTime("01:15:00");

  assert.equal(targetTimeMs, 4_500_000);
  assert.equal(formatPace(deriveRaceRunPace(targetTimeMs)), "04:19");

  const prescriptions = deriveRunPrescriptions({
    targetTimeMs,
    run1kmPrMs: parseClockTime("04:00"),
  });

  assert.deepEqual(
    prescriptions.map((item) => item.label),
    ["easy", "race", "threshold", "interval"]
  );

  const [easy, race, threshold, interval] = prescriptions;
  assert.ok(easy.paceMsPerKm > race.paceMsPerKm);
  assert.ok(race.paceMsPerKm >= threshold.paceMsPerKm);
  assert.ok(threshold.paceMsPerKm >= interval.paceMsPerKm);
});

test("equipment detection and local substitution preserve the blocked stimulus", () => {
  const block = workoutBlock(["4 rounds", "25m Sled Push", "20 Wall Balls"]);

  assert.deepEqual(getRequiredEquipment(block), ["sled", "wallBall"]);
  assert.deepEqual(getMissingEquipment(block, { sled: false, wallBall: false }), ["sled", "wallBall"]);

  const substitution = buildLocalSubstitution(block, {
    sled: false,
    wallBall: false,
    dumbbells: true,
    kettlebells: false,
  });

  assert.ok(substitution);
  assert.equal(substitution.name, "Local Substitution");
  assert.equal(substitution.targetDuration, 18);
  assert.match(substitution.details.join(" "), /dumbbell/i);
  assert.match(substitution.details.join(" "), /same target duration|target duration/i);
});

test("coach guardrails accept a complete HYROX microcycle", () => {
  const result = validateCoachReadyMicrocycle(validMicrocycle());

  assert.equal(result.days.length, 7);
  assert.deepEqual(result.issues, []);
});

test("coach guardrails reject missing runs, bad rest count, and unavailable equipment", () => {
  const plan = validMicrocycle().map((item) => ({
    ...item,
    blocks: item.isRestDay ? [] : [workoutBlock(["Strength circuit", "Farmer Carry 200m"])],
  }));
  plan[1] = day("2026-05-02", [workoutBlock(["Sled Push 4 x 25m", "Farmer Carry 200m"])]);
  plan[6] = { ...plan[6], isRestDay: true, blocks: [] };

  const result = validateCoachReadyMicrocycle(plan, { equipment: { sled: false } });
  const codes = result.issues.map((issue) => issue.code);

  assert.ok(codes.includes("rest_day_count"));
  assert.ok(codes.includes("missing_running_sessions"));
  assert.ok(codes.includes("unavailable_equipment"));
});

test("readiness summary detects high fatigue and pain notes", () => {
  const readiness = summarizeReadiness(
    {
      "2026-04-28": {
        date: "2026-04-28",
        rpe: 9,
        blockLogs: { 0: { notes: "Right knee pain after lunges" } },
      },
      "2026-04-30": {
        date: "2026-04-30",
        rpe: 8,
        blockLogs: { 0: { notes: "小腿有点痛，跑步后更明显" } },
      },
    },
    "2026-05-01"
  );

  assert.equal(readiness.level, "red");
  assert.equal(readiness.completedSessions, 2);
  assert.equal(readiness.volumeMultiplier, 0.65);
  assert.equal(readiness.painSignals.length, 2);
});
