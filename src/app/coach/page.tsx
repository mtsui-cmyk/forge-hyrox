"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Brain, Flame, RefreshCw, Zap } from "lucide-react";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTranslation } from "@/components/I18nProvider";
import { useTrainingStore } from "@/store/useTrainingStore";
import { createDemoMicrocycle, DEMO_PROFILE, isDemoMode, todayDateString } from "@/lib/demoMode";
import { buildLongTermPlan, buildWeekFromLongTermPlan } from "@/lib/longTermPlan";
import { scheduledWorkoutFromDay } from "@/lib/scheduledWorkout";
import { BUILT_IN_WORKOUT_TEMPLATES, templateToTrainingDay } from "@/lib/workoutLibrary";
import type { TrainingDay } from "@/lib/trainingPlan";

const phaseLabel = (phase: string, lang: string) => {
  if (lang !== "zh") return phase;
  return {
    Base: "基础期",
    Build: "建设期",
    Peak: "峰值期",
    Taper: "减量期",
    Race: "比赛周",
  }[phase] || phase;
};

const focusLabel = (focus: string, lang: string) => {
  if (lang !== "zh") return focus;
  return focus
    .replace("Aerobic base and movement quality", "有氧基础与动作质量")
    .replace("Compromised running and station strength", "跑站转换与站点力量")
    .replace("Race simulation and specificity", "比赛模拟与专项化")
    .replace("Freshness, rhythm, and race pace", "恢复新鲜度、节奏与比赛配速");
};

const planTitle = (title: string, lang: string) => lang === "zh"
  ? title.replace("8-Week HYROX Intermediate Build", "8 周 HYROX 进阶备赛周期")
  : title;

export default function CoachPage() {
  const { lang, t } = useTranslation();
  const {
    completedLogs,
    longTermPlan,
    setLongTermPlan,
    setMicrocycle,
    upsertScheduledWorkout,
    upsertWorkoutTemplate,
  } = useTrainingStore();
  const [generationState, setGenerationState] = useState<"idle" | "generating" | "fallback" | "failed">("idle");
  const [generationMessage, setGenerationMessage] = useState("");
  const startDate = todayDateString();

  const localLongTermPlan = () => buildLongTermPlan({
    startDate,
    raceDate: DEMO_PROFILE.nextRaceDate,
    targetTime: DEMO_PROFILE.targetTime,
    fitnessLevel: DEMO_PROFILE.fitnessLevel,
    weeks: 8,
  });

  const generateLongTermPlan = async () => {
    setGenerationState("generating");
    setGenerationMessage("Generating long-term plan...");
    const fallback = localLongTermPlan();

    if (isDemoMode()) {
      setLongTermPlan(fallback);
      setGenerationState("fallback");
      setGenerationMessage(t("coach.demoLongTerm"));
      return;
    }

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "long-term", startDate, weeks: 8, profile: DEMO_PROFILE }),
      });
      if (!response.ok) throw new Error("coach_api_failed");
      const data = await response.json();
      setLongTermPlan(data.plan || fallback);
      setGenerationState(data.generation?.fallbackUsed ? "fallback" : "idle");
      setGenerationMessage(data.generation?.fallbackUsed ? t("coach.apiFallbackSaved") : t("coach.longTermSaved"));
    } catch {
      setLongTermPlan(fallback);
      setGenerationState("failed");
      setGenerationMessage(t("coach.apiFailedLocalFallback"));
    }
  };

  const generateWeek = async () => {
    setGenerationState("generating");
    setGenerationMessage("Generating current week...");
    const plan = longTermPlan || localLongTermPlan();
    const baseWeek = createDemoMicrocycle(startDate, lang === "zh" ? "zh" : "en");
    const fallbackWeek = buildWeekFromLongTermPlan({ plan, weekIndex: plan.currentWeekIndex, completedLogs, baseWeek });
    if (!longTermPlan) setLongTermPlan(plan);

    const applyWeek = (week: TrainingDay[], idPrefix: string) => {
      setMicrocycle(week as any);
      week.forEach((day) => upsertScheduledWorkout(scheduledWorkoutFromDay(day, "ai", `${idPrefix}-${day.date}`)));
    };

    if (isDemoMode()) {
      applyWeek(fallbackWeek, "demo-coach");
      setGenerationState("fallback");
      setGenerationMessage(t("coach.demoWeek"));
      return;
    }

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "week",
          startDate,
          plan,
          weekIndex: plan.currentWeekIndex,
          completedLogs,
          lang,
          profile: DEMO_PROFILE,
        }),
      });
      if (!response.ok) throw new Error("coach_api_failed");
      const data = await response.json();
      const week = (data.week || fallbackWeek) as TrainingDay[];
      applyWeek(week, "coach-week");
      setGenerationState(data.generation?.fallbackUsed ? "fallback" : "idle");
      setGenerationMessage(data.readinessSnapshot
        ? t("coach.weekSavedWithReadiness", { level: data.readinessSnapshot.level })
        : t("coach.weekSaved"));
    } catch {
      applyWeek(fallbackWeek, "local-coach");
      setGenerationState("failed");
      setGenerationMessage(t("coach.apiFailedLocalFallback"));
    }
  };

  const generateSingleWorkout = async () => {
    setGenerationState("generating");
    setGenerationMessage("Generating single workout...");
    const fallbackTemplate = {
      ...BUILT_IN_WORKOUT_TEMPLATES.find((item) => item.focus === "Compromised Running")!,
      id: `coach-${Date.now()}`,
      title: "AI Coach: 45 Min Compromised Engine",
      isFavorite: true,
      isBuiltIn: false,
    };
    const fallbackWorkout = templateToTrainingDay(fallbackTemplate, format(new Date(), "yyyy-MM-dd"));

    const applyWorkout = (workout: TrainingDay) => {
      upsertWorkoutTemplate(fallbackTemplate);
      setMicrocycle([workout] as any);
      upsertScheduledWorkout(scheduledWorkoutFromDay(workout, "ai", `coach-single-${workout.date}`));
    };

    if (isDemoMode()) {
      applyWorkout(fallbackWorkout);
      setGenerationState("fallback");
      setGenerationMessage(t("coach.demoSingle"));
      return;
    }

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "single", startDate, focus: "Compromised Running", profile: DEMO_PROFILE }),
      });
      if (!response.ok) throw new Error("coach_api_failed");
      const data = await response.json();
      applyWorkout((data.workout || fallbackWorkout) as TrainingDay);
      setGenerationState(data.generation?.fallbackUsed ? "fallback" : "idle");
      setGenerationMessage(data.generation?.fallbackUsed ? t("coach.singleFallbackSaved") : t("coach.singleSaved"));
    } catch {
      applyWorkout(fallbackWorkout);
      setGenerationState("failed");
      setGenerationMessage(t("coach.apiFailedLocalFallback"));
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background pb-28">
      <header className="fixed top-0 z-50 w-full bg-[#131313] border-b border-outline/10">
        <div className="h-16 px-6 flex items-center gap-2 max-w-2xl mx-auto">
          <Flame className="w-5 h-5 text-primary fill-primary" />
          <h1 className="font-display font-black text-xl italic uppercase text-primary">FORGE <span className="text-on-surface">/ {t("coach.title")}</span></h1>
        </div>
      </header>
      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-5">
        <section className="bg-surface-container border border-outline/20 rounded-xl p-5">
          <Brain className="w-8 h-8 text-primary mb-3" />
          <h2 className="font-display font-black text-3xl uppercase italic tracking-tight">{t("coach.heading")}</h2>
          <p className="text-xs text-outline mt-2 leading-relaxed">{t("coach.headingDesc")}</p>
        </section>

        <button onClick={generateLongTermPlan} className="w-full bg-primary text-on-primary rounded-xl p-5 text-left">
          <p className="font-display font-black uppercase flex items-center gap-2"><RefreshCw className="w-4 h-4" /> {t("coach.generateLongTerm")}</p>
          <p className="text-xs mt-2 opacity-70">{t("coach.generateLongTermDesc")}</p>
        </button>
        <button onClick={generateWeek} className="w-full bg-surface-container border border-outline/20 rounded-xl p-5 text-left">
          <p className="font-display font-black uppercase flex items-center gap-2 text-primary"><Zap className="w-4 h-4" /> {t("coach.generateWeek")}</p>
          <p className="text-xs mt-2 text-outline">{t("coach.generateWeekDesc")}</p>
        </button>
        <button onClick={generateSingleWorkout} className="w-full bg-surface-container border border-outline/20 rounded-xl p-5 text-left">
          <p className="font-display font-black uppercase text-primary">{t("coach.generateSingle")}</p>
          <p className="text-xs mt-2 text-outline">{t("coach.generateSingleDesc")}</p>
        </button>

        {generationState !== "idle" && (
          <section className={`border rounded-xl p-4 text-xs ${
            generationState === "generating" ? "bg-surface-container border-outline/20 text-outline" :
            generationState === "failed" ? "bg-red-950/30 border-red-500/30 text-red-100" :
            "bg-primary/10 border-primary/30 text-primary"
          }`}>
            <p className="font-display font-black uppercase">{t(`coach.state.${generationState}`)}</p>
            <p className="mt-1">{generationMessage}</p>
          </section>
        )}

        {longTermPlan && (
          <section className="bg-surface-container border border-outline/20 rounded-xl p-4 space-y-3">
            <h3 className="font-display font-black uppercase text-lg">{planTitle(longTermPlan.title, lang)}</h3>
            {longTermPlan.weeks.map((week) => (
              <div key={week.weekIndex} className="bg-surface/60 rounded-lg p-3 border border-outline/10">
                <p className="font-display font-black uppercase text-sm">{t("coach.weekLabel", { week: week.weekIndex + 1 })}: {phaseLabel(week.phase, lang)}</p>
                <p className="text-[10px] text-outline mt-1">{focusLabel(week.focus, lang)} • {t("coach.volume", { volume: week.volumeTarget })}</p>
              </div>
            ))}
          </section>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
}
