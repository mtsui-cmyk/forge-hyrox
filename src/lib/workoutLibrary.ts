import type { EquipmentKey } from "./equipmentSubstitutions.ts";
import type { TrainingBlock, TrainingDay } from "./trainingPlan.ts";

export type WorkoutFocus =
  | "Engine"
  | "Strength"
  | "Compromised Running"
  | "Race Simulation"
  | "Recovery"
  | "No Equipment"
  | "Hotel Gym";

export type WorkoutDifficulty = "Beginner" | "Intermediate" | "Advanced" | "Elite";

export type WorkoutTemplate = {
  id: string;
  title: string;
  focus: WorkoutFocus;
  duration: number;
  difficulty: WorkoutDifficulty;
  equipmentRequired: EquipmentKey[];
  blocks: TrainingBlock[];
  isFavorite?: boolean;
  isBuiltIn?: boolean;
};

const block = (
  name: string,
  details: string[],
  targetDuration: number,
  type: TrainingBlock["type"] = "MainSet",
  format: TrainingBlock["format"] = "Rounds"
): TrainingBlock => ({ type, name, format, details, targetDuration });

type TemplateSeed = [string, WorkoutFocus, number, WorkoutDifficulty, EquipmentKey[], string[]];

const TEMPLATE_SEEDS: TemplateSeed[] = [
  ["Ski Threshold Ladder", "Engine", 42, "Intermediate", ["skiErg"], ["1000m SkiErg", "800m run @ threshold", "750m SkiErg", "600m run @ threshold", "500m SkiErg"]],
  ["Row Run Cruise", "Engine", 45, "Intermediate", ["rower"], ["4 rounds:", "750m RowErg", "1km run @ race pace"]],
  ["Zone 2 Durability", "Engine", 60, "Beginner", [], ["EASY prescription: 45-60 min run", "Keep conversational effort"]],
  ["Engine Bomb", "Engine", 50, "Advanced", ["rower", "skiErg"], ["2000m RowErg", "1km run", "2000m SkiErg", "1km run"]],
  ["Tempo Builder", "Engine", 38, "Intermediate", [], ["3 x 2km @ threshold", "3 min easy jog between reps"]],
  ["Sled Push Power", "Strength", 40, "Advanced", ["sled"], ["6 x 25m Sled Push", "90 sec rest", "10 heavy goblet squats after each push"]],
  ["Sled Pull Strength", "Strength", 38, "Advanced", ["sled"], ["5 x 25m Sled Pull", "12 strict bent-over rows", "Rest 2 min"]],
  ["Carry Chassis", "Strength", 35, "Intermediate", ["kettlebells"], ["5 rounds:", "100m Farmer Carry", "20 walking lunges", "45 sec plank"]],
  ["Wall Ball Capacity", "Strength", 32, "Intermediate", ["wallBall"], ["EMOM 24", "Min 1: 18 Wall Balls", "Min 2: 12 burpees", "Min 3: rest"]],
  ["Lunge Load", "Strength", 36, "Intermediate", ["sandbag"], ["4 rounds:", "30m Sandbag Lunges", "400m run", "20 sit-ups"]],
  ["Run Into Push", "Compromised Running", 44, "Advanced", ["sled"], ["4 rounds:", "1km run @ race pace", "25m Sled Push", "20 burpee broad jumps"]],
  ["Run Into Pull", "Compromised Running", 42, "Advanced", ["sled"], ["4 rounds:", "800m run @ race pace", "25m Sled Pull", "100m Farmer Carry"]],
  ["Wall Ball Finish", "Compromised Running", 35, "Intermediate", ["wallBall"], ["3 rounds:", "1km run", "35 Wall Balls"]],
  ["Carry Run Reset", "Compromised Running", 40, "Intermediate", ["kettlebells"], ["5 rounds:", "600m run", "80m Farmer Carry"]],
  ["Burpee Run Pain Cave", "Compromised Running", 36, "Advanced", [], ["5 rounds:", "600m run", "15 burpee broad jumps"]],
  ["Half HYROX Simulation", "Race Simulation", 70, "Advanced", ["skiErg", "rower", "sled", "wallBall"], ["1km run + 1000m SkiErg", "1km run + Sled Push", "1km run + RowErg", "1km run + Wall Balls"]],
  ["Station Sampler", "Race Simulation", 55, "Intermediate", ["rower", "wallBall", "kettlebells"], ["4 rounds:", "1km run", "500m RowErg", "50m Farmer Carry", "20 Wall Balls"]],
  ["Race Pace Lock", "Race Simulation", 48, "Advanced", ["sled", "wallBall"], ["3 rounds:", "1km run @ race pace", "25m Sled Push", "25 Wall Balls"]],
  ["Back Half Rehearsal", "Race Simulation", 60, "Advanced", ["rower", "kettlebells", "sandbag", "wallBall"], ["1km run + RowErg", "1km run + Farmer Carry", "1km run + Sandbag Lunges", "1km run + Wall Balls"]],
  ["Open Standard Touches", "Race Simulation", 52, "Intermediate", ["skiErg", "rower", "wallBall"], ["1000m SkiErg", "1km run", "1000m RowErg", "1km run", "75 Wall Balls"]],
  ["Recovery Flush", "Recovery", 30, "Beginner", [], ["20 min easy bike or walk", "10 min mobility", "Nasal breathing only"]],
  ["Mobility Reset", "Recovery", 25, "Beginner", [], ["Hip mobility", "Thoracic rotation", "Calf and hamstring stretch"]],
  ["Easy Erg Flush", "Recovery", 35, "Beginner", ["rower"], ["30 min RowErg Zone 2", "5 min breathing cooldown"]],
  ["Low Impact Engine", "Recovery", 40, "Intermediate", ["bike"], ["35 min Bike Zone 2", "Keep RPE <= 5"]],
  ["No Equipment Engine", "No Equipment", 32, "Beginner", [], ["5 rounds:", "400m run", "20 air squats", "12 push-ups"]],
  ["Bodyweight Chipper", "No Equipment", 34, "Intermediate", [], ["80 walking lunges", "60 sit-ups", "40 burpees", "20 push-ups", "1km run"]],
  ["Travel Threshold", "No Equipment", 45, "Intermediate", [], ["6 x 800m run @ threshold", "90 sec walk between reps"]],
  ["Hotel DB Engine", "Hotel Gym", 38, "Intermediate", ["dumbbells"], ["4 rounds:", "800m treadmill run", "20 DB thrusters", "20 DB reverse lunges"]],
  ["Hotel Incline Sled Sub", "Hotel Gym", 36, "Intermediate", ["treadmill", "dumbbells"], ["5 rounds:", "3 min incline treadmill walk", "16 DB front-rack lunges"]],
  ["Small Gym Compromised Run", "Hotel Gym", 40, "Advanced", ["dumbbells", "rower"], ["4 rounds:", "500m RowErg", "20 DB snatches", "800m run"]],
  ["Kettlebell Hotel Circuit", "Hotel Gym", 32, "Intermediate", ["kettlebells"], ["AMRAP 28", "20 KB swings", "20 goblet squats", "400m run"]],
  ["Dumbbell Wall Ball Sub", "Hotel Gym", 30, "Beginner", ["dumbbells"], ["EMOM 24", "Min 1: 12 DB thrusters", "Min 2: 12 burpees", "Min 3: 200m run"]],
];

export const BUILT_IN_WORKOUT_TEMPLATES: WorkoutTemplate[] = TEMPLATE_SEEDS.map(
  ([title, focus, duration, difficulty, equipmentRequired, details], index) => ({
    id: `built-in-${index + 1}`,
    title,
    focus,
    duration,
    difficulty,
    equipmentRequired,
    blocks: [block(title, details, duration)],
    isBuiltIn: true,
  })
);

export function filterWorkoutTemplates(
  templates: WorkoutTemplate[],
  filters: {
    focus?: string;
    difficulty?: string;
    maxDuration?: number;
    availableEquipment?: Partial<Record<EquipmentKey, boolean>>;
  }
): WorkoutTemplate[] {
  return templates.filter((template) => {
    if (filters.focus && filters.focus !== "All" && template.focus !== filters.focus) return false;
    if (filters.difficulty && filters.difficulty !== "All" && template.difficulty !== filters.difficulty) return false;
    if (filters.maxDuration && template.duration > filters.maxDuration) return false;
    if (filters.availableEquipment) {
      return template.equipmentRequired.every((item) => filters.availableEquipment?.[item] !== false);
    }
    return true;
  });
}

export function templateToTrainingDay(template: WorkoutTemplate, date: string): TrainingDay {
  return {
    date,
    isRestDay: template.focus === "Recovery",
    phase: template.focus,
    title: template.title,
    description: `${template.duration} min ${template.difficulty} ${template.focus} session.`,
    planAdjustments: [],
    coachNotes: [
      `Selected from the ${template.focus} library for a ${template.duration}-minute training window.`,
      template.equipmentRequired.length > 0
        ? `Requires: ${template.equipmentRequired.join(", ")}.`
        : "No special equipment required.",
    ],
    blocks: template.blocks,
  };
}
