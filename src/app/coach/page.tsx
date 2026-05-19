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

export default function CoachPage() {
  const { lang } = useTranslation();
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
      setGenerationMessage("Demo mode used deterministic local coach. No API or database write was made.");
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
      setGenerationMessage(data.generation?.fallbackUsed
        ? "Deterministic coach fallback was saved with generation metadata."
        : "Long-term plan generated and saved.");
    } catch {
      setLongTermPlan(fallback);
      setGenerationState("failed");
      setGenerationMessage("Coach API failed. Local deterministic fallback was applied in the browser.");
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
      setGenerationMessage("Demo mode generated the current week locally without database writes.");
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
        ? `Current week saved with readiness snapshot: ${data.readinessSnapshot.level}.`
        : "Current week generated and saved.");
    } catch {
      applyWeek(fallbackWeek, "local-coach");
      setGenerationState("failed");
      setGenerationMessage("Coach API failed. Local deterministic fallback was applied in the browser.");
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
      setGenerationMessage("Demo mode created a local single workout without API or database writes.");
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
      setGenerationMessage(data.generation?.fallbackUsed
        ? "Single workout saved using deterministic coach fallback."
        : "Single workout generated and saved.");
    } catch {
      applyWorkout(fallbackWorkout);
      setGenerationState("failed");
      setGenerationMessage("Coach API failed. Local deterministic fallback was applied in the browser.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background pb-28">
      <header className="fixed top-0 z-50 w-full bg-[#131313] border-b border-outline/10">
        <div className="h-16 px-6 flex items-center gap-2 max-w-2xl mx-auto">
          <Flame className="w-5 h-5 text-primary fill-primary" />
          <h1 className="font-display font-black text-xl italic uppercase text-primary">FORGE <span className="text-on-surface">/ COACH</span></h1>
        </div>
      </header>
      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-5">
        <section className="bg-surface-container border border-outline/20 rounded-xl p-5">
          <Brain className="w-8 h-8 text-primary mb-3" />
          <h2 className="font-display font-black text-3xl uppercase italic tracking-tight">AI Long-Term Coach</h2>
          <p className="text-xs text-outline mt-2 leading-relaxed">Generate 4-8 week planning structure, current week sessions, or a single workout. Production requests use the guarded Coach API; demo mode stays local.</p>
        </section>

        <button onClick={generateLongTermPlan} className="w-full bg-primary text-on-primary rounded-xl p-5 text-left">
          <p className="font-display font-black uppercase flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Generate 8-Week Plan</p>
          <p className="text-xs mt-2 opacity-70">Creates Base / Build / Peak / Taper structure with deload and volume targets.</p>
        </button>
        <button onClick={generateWeek} className="w-full bg-surface-container border border-outline/20 rounded-xl p-5 text-left">
          <p className="font-display font-black uppercase flex items-center gap-2 text-primary"><Zap className="w-4 h-4" /> Generate Current Week</p>
          <p className="text-xs mt-2 text-outline">Applies readiness and long-term phase to a 7-day HYROX week.</p>
        </button>
        <button onClick={generateSingleWorkout} className="w-full bg-surface-container border border-outline/20 rounded-xl p-5 text-left">
          <p className="font-display font-black uppercase text-primary">Generate Single Workout</p>
          <p className="text-xs mt-2 text-outline">Creates a 45-minute session and saves it to the training library.</p>
        </button>

        {generationState !== "idle" && (
          <section className={`border rounded-xl p-4 text-xs ${
            generationState === "generating" ? "bg-surface-container border-outline/20 text-outline" :
            generationState === "failed" ? "bg-red-950/30 border-red-500/30 text-red-100" :
            "bg-primary/10 border-primary/30 text-primary"
          }`}>
            <p className="font-display font-black uppercase">{generationState}</p>
            <p className="mt-1">{generationMessage}</p>
          </section>
        )}

        {longTermPlan && (
          <section className="bg-surface-container border border-outline/20 rounded-xl p-4 space-y-3">
            <h3 className="font-display font-black uppercase text-lg">{longTermPlan.title}</h3>
            {longTermPlan.weeks.map((week) => (
              <div key={week.weekIndex} className="bg-surface/60 rounded-lg p-3 border border-outline/10">
                <p className="font-display font-black uppercase text-sm">Week {week.weekIndex + 1}: {week.phase}</p>
                <p className="text-[10px] text-outline mt-1">{week.focus} • Volume {week.volumeTarget}%</p>
              </div>
            ))}
          </section>
        )}
      </main>
      <BottomNavBar />
    </div>
  );
}
