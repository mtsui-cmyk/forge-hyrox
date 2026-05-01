import type { TrainingBlock } from "@/lib/trainingPlan";

export type EquipmentKey =
  | "skiErg"
  | "rower"
  | "sled"
  | "wallBall"
  | "kettlebells"
  | "dumbbells"
  | "sandbag"
  | "pullUpBar"
  | "treadmill"
  | "bike"
  | "cableMachine";

export type EquipmentAvailability = Record<EquipmentKey, boolean>;
export type SubstitutionLocale = "en" | "zh";

export const DEFAULT_EQUIPMENT_AVAILABILITY: EquipmentAvailability = {
  skiErg: true,
  rower: true,
  sled: true,
  wallBall: true,
  kettlebells: true,
  dumbbells: true,
  sandbag: false,
  pullUpBar: true,
  treadmill: true,
  bike: false,
  cableMachine: false,
};

export const EQUIPMENT_LABELS: Record<EquipmentKey, string> = {
  skiErg: "SkiErg",
  rower: "RowErg",
  sled: "Sled",
  wallBall: "Wall Ball",
  kettlebells: "Kettlebells",
  dumbbells: "Dumbbells",
  sandbag: "Sandbag",
  pullUpBar: "Pull-Up Bar",
  treadmill: "Treadmill",
  bike: "Bike",
  cableMachine: "Cable Machine",
};

const EQUIPMENT_PATTERNS: Array<[EquipmentKey, RegExp]> = [
  ["skiErg", /\b(ski ?erg|skierg)\b|滑雪机|滑雪/gim],
  ["rower", /\b(row ?erg|rower|rowing)\b|划船机|划船/gim],
  ["sled", /\b(sled|prowler)\b|雪橇/gim],
  ["wallBall", /\bwall ?balls?\b|墙球/gim],
  ["kettlebells", /\b(kettlebells?|kb)\b|壶铃/gim],
  ["dumbbells", /\b(dumbbells?|dbs?)\b|哑铃/gim],
  ["sandbag", /\bsandbags?\b|沙袋/gim],
  ["pullUpBar", /\b(pull-?up|toes to bar)\b|引体|单杠/gim],
  ["treadmill", /\btreadmill\b|跑步机/gim],
  ["bike", /\b(assault bike|echo bike|bike|cycling)\b|单车|风阻车/gim],
  ["cableMachine", /\b(cable|cable machine)\b|绳索/gim],
];

function blockText(block: Pick<TrainingBlock, "name" | "details">): string {
  return [block.name, ...block.details].join(" ");
}

export function getRequiredEquipment(block: Pick<TrainingBlock, "name" | "details">): EquipmentKey[] {
  const text = blockText(block);
  return EQUIPMENT_PATTERNS.reduce<EquipmentKey[]>((required, [key, pattern]) => {
    pattern.lastIndex = 0;
    if (pattern.test(text) && !required.includes(key)) required.push(key);
    return required;
  }, []);
}

export function getMissingEquipment(
  block: Pick<TrainingBlock, "name" | "details">,
  availability: Partial<EquipmentAvailability>
): EquipmentKey[] {
  return getRequiredEquipment(block).filter((key) => availability[key] === false);
}

function chooseReplacementDetail(
  missing: EquipmentKey,
  availability: Partial<EquipmentAvailability>,
  locale: SubstitutionLocale
): string[] {
  const zh = locale === "zh";
  if (missing === "skiErg") {
    if (availability.rower) return [zh ? "划船机：保持相同目标时长或卡路里。" : "RowErg at the same target duration or calories."];
    if (availability.kettlebells) return [zh ? "高强度壶铃摆动：每 250m / 12-15 卡替换为 20 次。" : "Hard kettlebell swings: 20 reps per 250m / 12-15 calories."];
    if (availability.dumbbells) return [zh ? "交替哑铃抓举：每 250m / 12-15 卡替换为 16-20 次。" : "Alternating dumbbell snatches: 16-20 reps per 250m / 12-15 calories."];
    return [zh ? "快速波比或登山跑，保持相同工作时间。" : "Fast burpees or mountain climbers for the same work interval."];
  }

  if (missing === "sled") {
    if (availability.dumbbells) return [zh ? "重哑铃前架行走弓步或原地行进，保持相同距离/时间。" : "Heavy dumbbell front-rack walking lunges or marches for the same distance/time."];
    if (availability.kettlebells) return [zh ? "双壶铃前架搬运搭配行走弓步。" : "Double kettlebell front-rack carries plus walking lunges."];
    if (availability.treadmill) return [zh ? "跑步机上坡快走：10-15% 坡度，不扶扶手。" : "Treadmill incline power walk: 10-15% incline, hands off rails."];
    return [zh ? "慢速分腿蹲搭配熊爬间歇。" : "Slow tempo split squats plus bear crawl intervals."];
  }

  if (missing === "wallBall") {
    if (availability.dumbbells) return [zh ? "哑铃推举深蹲，保持可持续比赛节奏。" : "Dumbbell thrusters at a controlled, race-sustainable pace."];
    if (availability.kettlebells) return [zh ? "壶铃高脚杯深蹲搭配推举。" : "Kettlebell goblet squats plus push presses."];
    return [zh ? "徒手深蹲搭配波比，保留下肢灼烧感与呼吸压力。" : "Air squats plus burpees to preserve leg burn and breathing demand."];
  }

  if (missing === "sandbag") {
    if (availability.dumbbells) return [zh ? "哑铃前架行走弓步。" : "Dumbbell front-rack walking lunges."];
    if (availability.kettlebells) return [zh ? "壶铃前架行走弓步。" : "Kettlebell front-rack walking lunges."];
    return [zh ? "高次数徒手行走弓步。" : "High-volume bodyweight walking lunges."];
  }

  if (missing === "rower") {
    if (availability.skiErg) return [zh ? "SkiErg：保持相同目标时长或卡路里。" : "SkiErg at the same target duration or calories."];
    if (availability.bike) return [zh ? "单车训练，保持相同时长与呼吸强度。" : "Bike work at the same time domain and breathing intensity."];
    return [zh ? "折返跑或登箱，保持相同工作间歇。" : "Shuttle runs or step-ups for the same work interval."];
  }

  if (missing === "kettlebells" || missing === "dumbbells") {
    const other = missing === "kettlebells" ? "dumbbells" : "kettlebells";
    if (availability[other]) return [zh ? `使用${EQUIPMENT_LABELS[other]}完成相同搬运、弓步或髋铰链模式。` : `${EQUIPMENT_LABELS[other]} for the same carry/lunge/hinge pattern.`];
    return [zh ? "节奏型徒手力量训练，并增加次数。" : "Tempo bodyweight strength plus extra reps."];
  }

  if (missing === "bike") {
    if (availability.rower) return [zh ? "划船机：保持相同时长与强度。" : "RowErg at the same time domain and intensity."];
    if (availability.skiErg) return [zh ? "SkiErg：保持相同时长与强度。" : "SkiErg at the same time domain and intensity."];
    return [zh ? "同等主观强度的跑步间歇。" : "Running intervals at the same perceived effort."];
  }

  if (missing === "cableMachine") {
    if (availability.sled) return [zh ? "空间允许时使用重绳或负重拉拽模式。" : "Heavy rope or loaded pull pattern if space allows."];
    return [zh ? "弹力带划船或毛巾等长拉。" : "Band rows or towel isometric pulls."];
  }

  return [zh ? "选择最接近的动作模式，并保持相同努力程度与时间域。" : "Use the closest available movement pattern while keeping the same effort and time domain."];
}

export function buildLocalSubstitution(
  block: TrainingBlock,
  availability: Partial<EquipmentAvailability>,
  locale: SubstitutionLocale = "en"
): TrainingBlock | null {
  const missing = getMissingEquipment(block, availability);
  if (missing.length === 0) return null;

  const replacementDetails = missing.flatMap((item) => chooseReplacementDetail(item, availability, locale));
  return {
    ...block,
    name: locale === "zh" ? "本地替代方案" : "Local Substitution",
    details: [
      locale === "zh"
        ? `保留原始训练刺激：${block.type} / ${block.format}`
        : `Original stimulus preserved: ${block.type} / ${block.format}`,
      ...replacementDetails,
      locale === "zh"
        ? "保持与原训练块相同的目标时长、RPE 和转换压力。"
        : "Keep the same target duration, RPE, and transition pressure as the original block.",
    ],
  };
}
