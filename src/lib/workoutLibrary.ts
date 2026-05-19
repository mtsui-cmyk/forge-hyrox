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

const ZH_TEMPLATE_TITLES: Record<string, string> = {
  "Ski Threshold Ladder": "SkiErg 阈值阶梯",
  "Row Run Cruise": "划船跑步巡航",
  "Zone 2 Durability": "Zone 2 耐力建设",
  "Engine Bomb": "引擎轰炸",
  "Tempo Builder": "节奏能力建设",
  "Sled Push Power": "雪橇推力量",
  "Sled Pull Strength": "雪橇拉力量",
  "Carry Chassis": "搬运核心底盘",
  "Wall Ball Capacity": "墙球容量",
  "Lunge Load": "负重弓步",
  "Run Into Push": "跑步接雪橇推",
  "Run Into Pull": "跑步接雪橇拉",
  "Wall Ball Finish": "墙球收尾",
  "Carry Run Reset": "搬运后跑步恢复",
  "Burpee Run Pain Cave": "波比跑步耐受",
  "Half HYROX Simulation": "半程 HYROX 模拟",
  "Station Sampler": "站点采样模拟",
  "Race Pace Lock": "比赛配速锁定",
  "Back Half Rehearsal": "后半程演练",
  "Open Standard Touches": "公开组标准触点",
  "Recovery Flush": "恢复冲洗",
  "Mobility Reset": "活动度重置",
  "Easy Erg Flush": "低强度测功仪恢复",
  "Low Impact Engine": "低冲击引擎",
  "No Equipment Engine": "无器械引擎",
  "Bodyweight Chipper": "自重 Chipper",
  "Travel Threshold": "差旅阈值跑",
  "Hotel DB Engine": "酒店哑铃引擎",
  "Hotel Incline Sled Sub": "酒店坡走雪橇替代",
  "Small Gym Compromised Run": "小型健身房跑站组合",
  "Kettlebell Hotel Circuit": "酒店壶铃循环",
  "Dumbbell Wall Ball Sub": "哑铃墙球替代",
};

export function localizeWorkoutFocus(focus: WorkoutFocus, lang: "en" | "zh" = "en"): string {
  if (lang !== "zh") return focus;
  return {
    Engine: "引擎",
    Strength: "力量",
    "Compromised Running": "跑站转换",
    "Race Simulation": "比赛模拟",
    Recovery: "恢复",
    "No Equipment": "无器械",
    "Hotel Gym": "酒店健身房",
  }[focus];
}

export function localizeWorkoutDifficulty(difficulty: WorkoutDifficulty, lang: "en" | "zh" = "en"): string {
  if (lang !== "zh") return difficulty;
  return {
    Beginner: "入门",
    Intermediate: "进阶",
    Advanced: "高阶",
    Elite: "精英",
  }[difficulty];
}

export function localizeWorkoutTitle(template: WorkoutTemplate, lang: "en" | "zh" = "en"): string {
  if (lang !== "zh") return template.title;
  return ZH_TEMPLATE_TITLES[template.title] || template.title;
}

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

export function templateToTrainingDay(template: WorkoutTemplate, date: string, lang: "en" | "zh" = "en"): TrainingDay {
  const localizedTitle = localizeWorkoutTitle(template, lang);
  const localizedFocus = localizeWorkoutFocus(template.focus, lang);
  const localizedDifficulty = localizeWorkoutDifficulty(template.difficulty, lang);
  return {
    date,
    isRestDay: template.focus === "Recovery",
    phase: localizedFocus,
    title: localizedTitle,
    description: lang === "zh"
      ? `${template.duration} 分钟 ${localizedDifficulty} ${localizedFocus}训练。`
      : `${template.duration} min ${template.difficulty} ${template.focus} session.`,
    planAdjustments: [],
    coachNotes: lang === "zh"
      ? [
          `从${localizedFocus}训练库中选择，适合 ${template.duration} 分钟训练窗口。`,
          template.equipmentRequired.length > 0
            ? `需要器械：${template.equipmentRequired.join(", ")}。`
            : "不需要特殊器械。",
        ]
      : [
          `Selected from the ${template.focus} library for a ${template.duration}-minute training window.`,
          template.equipmentRequired.length > 0
            ? `Requires: ${template.equipmentRequired.join(", ")}.`
            : "No special equipment required.",
        ],
    blocks: template.blocks,
  };
}
