import type { TrainingDay } from "./trainingPlan";
import type { EquipmentAvailability } from "./equipmentSubstitutions";

export const DEMO_PROFILE = {
  gender: "Male",
  ageGroup: "30-34",
  category: "Open",
  fitnessLevel: "Intermediate",
  weight: "75",
  restingHr: "52",
  maxHr: "190",
  targetTime: "01:15:00",
  nextRaceDate: "2026-06-20",
};

export const DEMO_EQUIPMENT: Partial<EquipmentAvailability> = {
  skiErg: true,
  rower: true,
  sled: false,
  wallBall: true,
  kettlebells: true,
  dumbbells: true,
  sandbag: false,
  pullUpBar: true,
  treadmill: true,
  bike: false,
  cableMachine: false,
};

export const DEMO_PRS: Record<string, number> = {
  Run1km: 4 * 60 * 1000 + 10 * 1000,
  SkiErg: 4 * 60 * 1000 + 5 * 1000,
  SledPush: 95 * 1000,
  SledPull: 105 * 1000,
  Burpee: 3 * 60 * 1000 + 40 * 1000,
  Rowing: 4 * 60 * 1000 + 2 * 1000,
  FarmersCarry: 2 * 60 * 1000 + 15 * 1000,
  Sandbag: 4 * 60 * 1000 + 30 * 1000,
  WallBalls: 4 * 60 * 1000 + 50 * 1000,
};

function addDays(startDate: string, offset: number): string {
  const base = new Date(`${startDate}T00:00:00`);
  base.setDate(base.getDate() + offset);
  return [
    base.getFullYear(),
    String(base.getMonth() + 1).padStart(2, "0"),
    String(base.getDate()).padStart(2, "0"),
  ].join("-");
}

export function todayDateString(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

export function createDemoMicrocycle(startDate = "2026-05-01", lang: "en" | "zh" = "en"): TrainingDay[] {
  const zh = lang === "zh";
  const adjustments = zh
    ? [
        "Demo 模式使用本地示例计划，不需要注册、数据库或 LLM API。",
        "今日器械中 Sled 和 Sandbag 标记为不可用，受影响站点会展示替代逻辑。",
        "计划使用 1km PR 和目标完赛时间推导跑步配速。",
      ]
    : [
        "Demo mode uses a local sample plan without registration, database setup, or an LLM API key.",
        "Sled and sandbag are marked unavailable today, so affected station work demonstrates substitution logic.",
        "Run prescriptions use the demo 1km PR and target finish time.",
      ];

  return [
    {
      date: addDays(startDate, 0),
      isRestDay: false,
      phase: zh ? "专项构建期" : "Specific Build",
      title: zh ? "雪橇替代引擎" : "Sled Substitution Engine",
      description: zh ? "在缺少雪橇的健身房保留推力和跑步转换刺激。" : "Preserve push power and compromised running when the gym lacks a sled.",
      planAdjustments: adjustments,
      coachNotes: zh
        ? ["今天展示 FORGE 如何处理缺少雪橇的情况。", "主训练保留 HYROX 的跑站转换压力。"]
        : ["This day shows how FORGE handles a missing sled.", "The main set keeps HYROX run-station transition pressure."],
      blocks: [
        {
          type: "WarmUp",
          name: zh ? "动态热身" : "Dynamic Prep",
          format: "Relax",
          details: zh ? ["8 分钟慢跑", "髋部与脚踝动态活动", "2 轮 10 次徒手深蹲"] : ["8 min easy jog", "Hip and ankle mobility", "2 rounds of 10 air squats"],
          targetDuration: 12,
        },
        {
          type: "MainSet",
          name: zh ? "跑步 + 雪橇替代" : "Run + Sled Alternative",
          format: "Rounds",
          details: zh
            ? ["4 轮:", "RACE prescription: 800m 跑步 @ 04:19/km", "25m Sled Push (152kg)", "20m 哑铃前架行走弓步"]
            : ["4 rounds:", "RACE prescription: 800m run @ 04:19/km", "25m Sled Push (152kg)", "20m dumbbell front-rack walking lunges"],
          targetDuration: 38,
        },
        {
          type: "CoolDown",
          name: zh ? "下肢放松" : "Lower-Body Flush",
          format: "Relax",
          details: zh ? ["小腿与股四头肌拉伸", "5 分钟鼻呼吸走路"] : ["Calf and quad stretch", "5 min nasal-breathing walk"],
          targetDuration: 10,
        },
      ],
    },
    {
      date: addDays(startDate, 1),
      isRestDay: false,
      phase: zh ? "专项构建期" : "Specific Build",
      title: zh ? "阈值跑" : "Threshold Run",
      description: zh ? "提升 HYROX 中后段保持配速的能力。" : "Improve the ability to hold pace through the back half of HYROX.",
      planAdjustments: adjustments,
      coachNotes: zh
        ? ["跑步配速来自目标完赛时间与 1km PR。", "今天不叠加重型站点，避免连续高冲击。"]
        : ["Run paces come from target finish time and 1km PR.", "No heavy station work is stacked today to control impact."],
      blocks: [
        {
          type: "WarmUp",
          name: zh ? "跑前激活" : "Run Activation",
          format: "Relax",
          details: zh ? ["A/B Skip", "4 x 20 秒渐速跑"] : ["A/B skips", "4 x 20 sec strides"],
          targetDuration: 15,
        },
        {
          type: "MainSet",
          name: zh ? "阈值巡航" : "Threshold Cruise",
          format: "Intervals",
          details: zh ? ["THRESHOLD prescription: 3 x 2km @ 04:10/km", "组间慢跑 3 分钟"] : ["THRESHOLD prescription: 3 x 2km @ 04:10/km", "3 min jog between reps"],
          targetDuration: 45,
        },
      ],
    },
    {
      date: addDays(startDate, 2),
      isRestDay: false,
      phase: zh ? "专项构建期" : "Specific Build",
      title: zh ? "墙球与划船" : "Wall Ball and Row",
      description: zh ? "强化赛末站点的腿部耐受与呼吸控制。" : "Build late-race leg tolerance and breathing control.",
      planAdjustments: adjustments,
      coachNotes: zh
        ? ["墙球训练用于模拟比赛末段高心率下的下肢输出。", "划船机保留低冲击引擎训练。"]
        : ["Wall balls simulate late-race leg output under high heart rate.", "RowErg work keeps engine training lower impact."],
      blocks: [
        {
          type: "MainSet",
          name: "EMOM 30",
          format: "EMOM",
          details: zh ? ["分钟 1: 15 墙球 (6kg)", "分钟 2: 15 Cal 划船", "分钟 3: 12 波比跳"] : ["Min 1: 15 Wall Balls (6kg)", "Min 2: 15 Cal RowErg", "Min 3: 12 burpees"],
          targetDuration: 30,
        },
      ],
    },
    {
      date: addDays(startDate, 3),
      isRestDay: true,
      phase: zh ? "恢复日" : "Recovery",
      title: zh ? "完整休息" : "Full Rest",
      description: zh ? "吸收前三天训练刺激，恢复神经系统。" : "Absorb the first three days and let the nervous system recover.",
      planAdjustments: adjustments,
      coachNotes: zh ? ["微周期保留完整休息日，避免连续堆叠疲劳。"] : ["A full rest day is kept to avoid stacking fatigue."],
      blocks: [],
    },
    {
      date: addDays(startDate, 4),
      isRestDay: false,
      phase: zh ? "专项构建期" : "Specific Build",
      title: zh ? "比赛配速锁定" : "Race Pace Lock-In",
      description: zh ? "用短间歇确认比赛节奏。" : "Use short repeats to rehearse race rhythm.",
      planAdjustments: adjustments,
      coachNotes: zh ? ["今天保留比赛配速触感，但总量受控。"] : ["Today keeps race-pace feel while controlling total volume."],
      blocks: [
        {
          type: "MainSet",
          name: zh ? "1km 重复跑" : "1km Repeats",
          format: "Intervals",
          details: zh ? ["RACE prescription: 5 x 1km @ 04:19/km", "组间休息 2 分钟"] : ["RACE prescription: 5 x 1km @ 04:19/km", "2 min rest between reps"],
          targetDuration: 40,
        },
      ],
    },
    {
      date: addDays(startDate, 5),
      isRestDay: false,
      phase: zh ? "专项构建期" : "Specific Build",
      title: zh ? "搬运与引擎" : "Carry and Engine",
      description: zh ? "强化农夫走后的跑步姿态恢复。" : "Rebuild running posture after loaded carries.",
      planAdjustments: adjustments,
      coachNotes: zh ? ["农夫走训练握力与躯干稳定。", "跑步穿插用于练习负重后的节奏恢复。"] : ["Farmer carries train grip and trunk stiffness.", "Interleaved runs rehearse rhythm after loading."],
      blocks: [
        {
          type: "MainSet",
          name: zh ? "搬运阶梯" : "Carry Ladder",
          format: "Rounds",
          details: zh ? ["3 轮:", "RACE prescription: 1km 跑步 @ 04:19/km", "100m Farmer Carry (24kgx2)", "30m 哑铃弓步"] : ["3 rounds:", "RACE prescription: 1km run @ 04:19/km", "100m Farmer Carry (24kgx2)", "30m dumbbell lunges"],
          targetDuration: 42,
        },
      ],
    },
    {
      date: addDays(startDate, 6),
      isRestDay: false,
      phase: zh ? "有氧建设" : "Aerobic Base",
      title: zh ? "长距离轻松跑" : "Long Easy Run",
      description: zh ? "建立 HYROX 最底层的有氧耐久。" : "Build the aerobic durability underneath HYROX performance.",
      planAdjustments: adjustments,
      coachNotes: zh ? ["轻松跑用于提升恢复能力和脂代谢。"] : ["The easy run improves recovery capacity and aerobic durability."],
      blocks: [
        {
          type: "MainSet",
          name: zh ? "Zone 2 长跑" : "Zone 2 Long Run",
          format: "Relax",
          details: zh ? ["EASY prescription: 10-12km @ 05:18/km", "保持能完整说话的强度"] : ["EASY prescription: 10-12km @ 05:18/km", "Keep conversational effort"],
          targetDuration: 70,
        },
      ],
    },
  ];
}

export function createDemoCompletedLogs(startDate = "2026-05-01") {
  return {
    [addDays(startDate, -3)]: {
      date: addDays(startDate, -3),
      totalTimeMs: 52 * 60 * 1000,
      blockLogs: { 0: { notes: "Felt strong, but quads were heavy after lunges." } },
      completedAt: `${addDays(startDate, -3)}T10:00:00.000Z`,
      rpe: 7,
    },
    [addDays(startDate, -1)]: {
      date: addDays(startDate, -1),
      totalTimeMs: 46 * 60 * 1000,
      blockLogs: { 0: { notes: "Hotel gym had no sled, dumbbell substitute worked well." } },
      completedAt: `${addDays(startDate, -1)}T10:00:00.000Z`,
      rpe: 6,
    },
  };
}
