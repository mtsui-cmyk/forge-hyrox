"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Filter, Flame, Plus, Star } from "lucide-react";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTranslation } from "@/components/I18nProvider";
import { useTrainingStore } from "@/store/useTrainingStore";
import { isDemoMode } from "@/lib/demoMode";
import { scheduledWorkoutFromDay } from "@/lib/scheduledWorkout";
import { BUILT_IN_WORKOUT_TEMPLATES, filterWorkoutTemplates, templateToTrainingDay, type WorkoutDifficulty, type WorkoutFocus } from "@/lib/workoutLibrary";

const focuses: Array<"All" | WorkoutFocus> = ["All", "Engine", "Strength", "Compromised Running", "Race Simulation", "Recovery", "No Equipment", "Hotel Gym"];
const difficulties: Array<"All" | WorkoutDifficulty> = ["All", "Beginner", "Intermediate", "Advanced", "Elite"];

export default function TrainPage() {
  const { t } = useTranslation();
  const { microcycle, setMicrocycle, scheduledWorkouts, upsertScheduledWorkout, workoutTemplates, setWorkoutTemplates, upsertWorkoutTemplate } = useTrainingStore();
  const [focus, setFocus] = useState<(typeof focuses)[number]>("All");
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>("All");
  const [maxDuration, setMaxDuration] = useState(60);
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualTitle, setManualTitle] = useState("Manual HYROX Builder");
  const [manualDetails, setManualDetails] = useState("4 rounds:\n800m run\n20 wall balls\n100m farmer carry");

  const templates = workoutTemplates.length > 0 ? workoutTemplates : BUILT_IN_WORKOUT_TEMPLATES;
  const filteredTemplates = useMemo(
    () => filterWorkoutTemplates(templates, { focus, difficulty, maxDuration }),
    [templates, focus, difficulty, maxDuration]
  );
  const week = scheduledWorkouts.length > 0
    ? scheduledWorkouts.map((item) => item.workout).sort((a, b) => a.date.localeCompare(b.date))
    : Object.values(microcycle).sort((a, b) => a.date.localeCompare(b.date));

  const scheduleTemplate = (id: string) => {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    const day = templateToTrainingDay(template, scheduleDate);
    setMicrocycle([day as any]);
    upsertScheduledWorkout(scheduledWorkoutFromDay(day, "library", `library-${scheduleDate}`));
  };

  const saveManualTemplate = () => {
    const template = {
      id: `manual-${Date.now()}`,
      title: manualTitle,
      focus: "Compromised Running" as WorkoutFocus,
      duration: 40,
      difficulty: "Intermediate" as WorkoutDifficulty,
      equipmentRequired: [],
      isFavorite: true,
      isBuiltIn: false,
      blocks: [{
        type: "MainSet" as const,
        name: manualTitle,
        format: "Rounds" as const,
        details: manualDetails.split("\n").map((line) => line.trim()).filter(Boolean),
        targetDuration: 40,
      }],
    };
    upsertWorkoutTemplate(template);
    upsertScheduledWorkout(scheduledWorkoutFromDay(templateToTrainingDay(template, scheduleDate), "manual", `manual-${scheduleDate}`));
    if (isDemoMode() && workoutTemplates.length === 0) setWorkoutTemplates([template, ...BUILT_IN_WORKOUT_TEMPLATES]);
  };

  return (
    <div className="min-h-screen bg-background text-on-background pb-28">
      <header className="fixed top-0 z-50 w-full bg-[#131313] border-b border-outline/10">
        <div className="h-16 px-6 flex items-center gap-2 max-w-2xl mx-auto">
          <Flame className="w-5 h-5 text-primary fill-primary" />
          <h1 className="font-display font-black text-xl italic uppercase text-primary">FORGE <span className="text-on-surface">/ TRAIN</span></h1>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-8">
        <section className="bg-surface-container border border-outline/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="font-display font-black uppercase text-lg">Training Block</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {week.slice(0, 8).map((day) => (
              <a key={day.date} href={`/workout/${day.date}`} className="bg-surface/60 rounded-lg border border-outline/20 p-3">
                <p className="text-[10px] text-outline font-bold uppercase">{day.date}</p>
                <p className="font-display font-black text-sm uppercase mt-1 line-clamp-2">{day.title}</p>
                <p className="text-[10px] text-on-surface/50 mt-1">{day.phase}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="bg-surface-container border border-outline/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <h2 className="font-display font-black uppercase text-lg">Workout Library</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={focus} onChange={(e) => setFocus(e.target.value as any)} className="bg-surface rounded-lg p-3 text-xs">
              {focuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="bg-surface rounded-lg p-3 text-xs">
              {difficulties.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <label className="block text-[10px] uppercase tracking-widest text-outline font-bold">
            Max duration: {maxDuration} min
            <input type="range" min={20} max={90} value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))} className="w-full mt-2" />
          </label>
          <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full bg-surface rounded-lg p-3 text-xs" />
          <div className="space-y-3">
            {filteredTemplates.slice(0, 12).map((template) => (
              <div key={template.id} className="bg-surface/60 rounded-lg border border-outline/20 p-3">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-display font-black uppercase text-sm">{template.title}</p>
                    <p className="text-[10px] text-outline mt-1">{template.focus} • {template.duration}m • {template.difficulty}</p>
                  </div>
                  <button onClick={() => scheduleTemplate(template.id)} className="bg-primary text-on-primary rounded-lg px-3 py-2 text-[10px] font-black uppercase">Schedule</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface-container border border-outline/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="font-display font-black uppercase text-lg">Manual Builder</h2>
          </div>
          <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="w-full bg-surface rounded-lg p-3 text-sm" />
          <textarea value={manualDetails} onChange={(e) => setManualDetails(e.target.value)} className="w-full bg-surface rounded-lg p-3 text-sm min-h-32" />
          <button onClick={saveManualTemplate} className="w-full bg-surface-container-high rounded-xl py-4 text-primary font-display font-black uppercase text-xs flex items-center justify-center gap-2">
            <Star className="w-4 h-4" /> Save to Library
          </button>
        </section>
      </main>
      <BottomNavBar />
    </div>
  );
}
