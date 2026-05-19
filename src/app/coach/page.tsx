"use client";

import { format } from "date-fns";
import { Brain, Flame, RefreshCw, Zap } from "lucide-react";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTranslation } from "@/components/I18nProvider";
import { useTrainingStore } from "@/store/useTrainingStore";
import { createDemoMicrocycle, DEMO_PROFILE, todayDateString } from "@/lib/demoMode";
import { buildLongTermPlan, buildWeekFromLongTermPlan } from "@/lib/longTermPlan";
import { BUILT_IN_WORKOUT_TEMPLATES, templateToTrainingDay } from "@/lib/workoutLibrary";

export default function CoachPage() {
  const { lang } = useTranslation();
  const { completedLogs, longTermPlan, setLongTermPlan, setMicrocycle, upsertWorkoutTemplate } = useTrainingStore();
  const startDate = todayDateString();

  const generateLongTermPlan = () => {
    setLongTermPlan(buildLongTermPlan({
      startDate,
      raceDate: DEMO_PROFILE.nextRaceDate,
      targetTime: DEMO_PROFILE.targetTime,
      fitnessLevel: DEMO_PROFILE.fitnessLevel,
      weeks: 8,
    }));
  };

  const generateWeek = () => {
    const plan = longTermPlan || buildLongTermPlan({
      startDate,
      raceDate: DEMO_PROFILE.nextRaceDate,
      targetTime: DEMO_PROFILE.targetTime,
      fitnessLevel: DEMO_PROFILE.fitnessLevel,
      weeks: 8,
    });
    if (!longTermPlan) setLongTermPlan(plan);
    const baseWeek = createDemoMicrocycle(startDate, lang === "zh" ? "zh" : "en");
    setMicrocycle(buildWeekFromLongTermPlan({ plan, weekIndex: plan.currentWeekIndex, completedLogs, baseWeek }) as any);
  };

  const generateSingleWorkout = () => {
    const template = {
      ...BUILT_IN_WORKOUT_TEMPLATES.find((item) => item.focus === "Compromised Running")!,
      id: `coach-${Date.now()}`,
      title: "AI Coach: 45 Min Compromised Engine",
      isFavorite: true,
      isBuiltIn: false,
    };
    upsertWorkoutTemplate(template);
    setMicrocycle([templateToTrainingDay(template, format(new Date(), "yyyy-MM-dd")) as any]);
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
          <p className="text-xs text-outline mt-2 leading-relaxed">Generate 4-8 week planning structure, current week sessions, or a single workout. Production LLM calls still use guarded fallback logic; this page exposes the product flow.</p>
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
