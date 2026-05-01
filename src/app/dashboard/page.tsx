"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, Brain, Dumbbell, Check, Flame, Rocket } from "lucide-react";
import { useTranslation, LanguageToggle } from "@/components/I18nProvider";
import { useSession } from "next-auth/react";
import { useTrainingStore } from "@/store/useTrainingStore";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { BottomNavBar } from "@/components/BottomNavBar";
import { format, isSameDay, isBefore, isAfter } from "date-fns";
import { normalizeTrainingPlan, normalizeTrainingPlanArray } from "@/lib/trainingPlan";
import { deriveRunPrescriptions, parseClockTime } from "@/lib/runPrescription";
import { summarizeReadiness } from "@/lib/readiness";
import { createDemoMicrocycle, DEMO_EQUIPMENT, DEMO_PROFILE, DEMO_PRS, isDemoMode, seedDemoWorkspace, todayDateString } from "@/lib/demoMode";

export default function Dashboard() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [equipment, setEquipment] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const { microcycle, setMicrocycle, completedLogs, prs, setPrs } = useTrainingStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Ensure today is start of day
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState("Balanced"); // Balanced, Strength, Engine, Transition

  // Time state for countdown
  const [now, setNow] = useState<Date>(new Date());

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedWod = microcycle[selectedDateStr];
  const planAdjustments = selectedWod?.planAdjustments?.filter(Boolean) ?? [];
  const isCompleted = !!completedLogs[selectedDateStr];
  const readiness = summarizeReadiness(completedLogs as any, selectedDateStr);
  const readinessStyles = {
    green: "border-[#00E475]/50 text-[#00E475]",
    yellow: "border-primary/60 text-primary",
    red: "border-[#FF5A5F]/60 text-[#FF5A5F]",
  }[readiness.level];
  const readinessTone = {
    green: "text-[#00E475]",
    yellow: "text-primary",
    red: "text-[#FF5A5F]",
  }[readiness.level];
  const readinessRecommendation = {
    green: t("dashboard.readinessGreen"),
    yellow: t("dashboard.readinessYellow"),
    red: t("dashboard.readinessRed"),
  }[readiness.level];
  
  const isToday = isSameDay(selectedDate, today);
  const isPast = isBefore(selectedDate, today);
  const isFuture = isAfter(selectedDate, today);

  useEffect(() => {
    async function initData() {
      if (status === "loading") return;

      if (isDemoMode()) {
        if (!localStorage.getItem("hyroxProfile")) {
          seedDemoWorkspace(lang === "zh" ? "zh" : "en");
        }
        const savedProfile = localStorage.getItem("hyroxProfile");
        const savedEquipment = localStorage.getItem("hyroxEquipment");
        setProfile(savedProfile ? JSON.parse(savedProfile) : DEMO_PROFILE);
        setEquipment(savedEquipment ? JSON.parse(savedEquipment) : DEMO_EQUIPMENT);
        if (Object.keys(useTrainingStore.getState().microcycle).length === 0) {
          useTrainingStore.getState().setMicrocycle(createDemoMicrocycle(todayDateString(), lang === "zh" ? "zh" : "en") as any);
        }
        if (Object.keys(useTrainingStore.getState().prs).length === 0) {
          setPrs(DEMO_PRS);
        }
        setIsSyncing(false);
        return;
      }

      if (status === "authenticated") {
        try {
          const res = await fetch("/api/sync");
          const dbData = await res.json();

          if (dbData.profileData) {
            const { profile, equipment } = dbData.profileData;
            localStorage.setItem("hyroxProfile", JSON.stringify(profile));
            if (equipment) localStorage.setItem("hyroxEquipment", JSON.stringify(equipment));

            setProfile(profile);
            setEquipment(equipment || {
              skiErg: true, rower: true, sled: true, wallBall: true, kettlebells: true, dumbbells: true, sandbag: false, pullUpBar: true
            });

            if (dbData.microcycle) {
              useTrainingStore.getState().setMicrocycle(normalizeTrainingPlanArray(dbData.microcycle) as any);
            }
            if (dbData.completedLogs) {
              for (const [date, log] of Object.entries(dbData.completedLogs)) {
                useTrainingStore.getState().logWorkoutResult(date, log as any);
              }
            }
            if (dbData.prs) {
              setPrs(dbData.prs);
            }
          } else {
            router.push("/onboarding");
            return;
          }
        } catch (e) {
          console.error(e);
        }
        setIsSyncing(false);
      } else {
        router.push("/login");
      }
    }

    initData();
  }, [status, router, lang, setPrs]);

  // Update "now" for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const handleGeneratePlan = async (focus: string = "Balanced") => {
    setIsGenerating(true);
    setShowFocusModal(false);
    try {
      const startStr = format(selectedDate, "yyyy-MM-dd");
      const targetTimeMs = parseClockTime(profile.targetTime || "01:15:00");
      const runPrescriptions = deriveRunPrescriptions({
        targetTimeMs,
        run1kmPrMs: prs.Run1km,
      });
      if (isDemoMode()) {
        const plan = createDemoMicrocycle(startStr, lang === "zh" ? "zh" : "en");
        setMicrocycle(plan as any);
        return;
      }
      const res = await fetch("/api/generate-wod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, equipment, startDate: startStr, completedLogs, focus, lang, runPrescriptions }),
      });
      if (!res.ok) throw new Error("API call failed");
      const data = await res.json();
      const planRecord = normalizeTrainingPlan(data);
      setMicrocycle(Object.values(planRecord) as any);
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ microcycle: planRecord }),
      });
    } catch (error) {
      console.error(error);
      alert("Failed to generate plan. Please check API key and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isSyncing || status === "loading" || !profile || !equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin w-12 h-12 border-4 border-surface-container-high border-t-primary rounded-full"></div>
      </div>
    );
  }

  // Calculate Countdown
  const raceDate = new Date(profile.nextRaceDate);
  const diffTime = raceDate.getTime() - now.getTime();
  const daysOut = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const hoursOut = Math.max(0, Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minsOut = Math.max(0, Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <div className="bg-background text-on-background antialiased pb-24 min-h-screen">
      {/* TopAppBar Shell */}
      <header className="bg-[#131313] fixed top-0 w-full z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-none mx-auto">
          <div className="flex items-center gap-2 active:scale-95 transition-transform cursor-pointer">
            <Flame className="text-primary w-6 h-6 fill-primary" />
            <h1 className="font-display font-black tracking-tighter uppercase text-2xl text-primary italic">FORGE</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div 
              onClick={() => router.push("/profile")}
              className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden active:scale-95 transition-transform cursor-pointer"
            >
              {/* Simple initial Avatar */}
              <span className="font-display font-bold text-xs text-on-surface">
                {isDemoMode() ? "D" : session?.user?.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 space-y-8 max-w-2xl mx-auto">
        {/* Countdown & Target Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="font-display text-[10px] font-bold tracking-widest uppercase text-outline mb-1">HYROX CHALLENGE</p>
              <h2 className="font-display font-black text-4xl tracking-tighter italic">{t("dashboard.countdown")}</h2>
            </div>
            <div className="text-right">
              <p className="font-display text-[10px] font-bold tracking-widest uppercase text-outline mb-1">{t("dashboard.targetTime")}</p>
              <p className="font-display font-black text-2xl text-primary tabular-nums tracking-tighter">
                {profile.targetTime || "--:--:--"}
              </p>
            </div>
          </div>
          
          {/* Kinetic Monolith Countdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container px-2 py-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group border border-outline/30">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="font-display font-black text-5xl tracking-tighter text-on-surface">{daysOut.toString().padStart(2, '0')}</span>
              <span className="font-display text-[10px] font-bold tracking-widest uppercase text-outline mt-2">{t("dashboard.days")}</span>
            </div>
            <div className="bg-surface-container px-2 py-6 rounded-xl flex flex-col items-center justify-center border border-outline/30">
              <span className="font-display font-black text-5xl tracking-tighter text-on-surface">{hoursOut.toString().padStart(2, '0')}</span>
              <span className="font-display text-[10px] font-bold tracking-widest uppercase text-outline mt-2">{t("dashboard.hours")}</span>
            </div>
            <div className="bg-surface-container px-2 py-6 rounded-xl flex flex-col items-center justify-center border border-outline/30">
              <span className="font-display font-black text-5xl tracking-tighter text-on-surface">{minsOut.toString().padStart(2, '0')}</span>
              <span className="font-display text-[10px] font-bold tracking-widest uppercase text-outline mt-2">{t("dashboard.mins")}</span>
            </div>
          </div>
        </section>

        <section className="bg-surface-container border border-outline/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg border ${readinessStyles} flex items-center justify-center shrink-0`}>
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-[10px] font-bold tracking-widest uppercase text-outline">{t("dashboard.readiness")}</p>
                <span className={`font-display text-[10px] font-black uppercase tracking-widest ${readinessTone}`}>
                  {readiness.level}
                </span>
              </div>
              <p className="font-sans text-xs text-on-surface/70 leading-relaxed mt-1">
                {t("dashboard.readinessSessions", { count: readiness.completedSessions })}
                {readiness.avgRpe ? ` • ${t("dashboard.readinessAvgRpe", { value: readiness.avgRpe.toFixed(1) })}` : ""}
                {` • ${t("dashboard.readinessVolume", { percent: Math.round(readiness.volumeMultiplier * 100) })}`}
              </p>
              <p className="font-sans text-[11px] text-outline leading-relaxed mt-2">{readinessRecommendation}</p>
            </div>
          </div>
          {(readiness.redFlagSignals.length > 0 || readiness.painSignals.length > 0) && (
            <div className="mt-4 rounded-lg border border-[#FF5A5F]/40 bg-[#FF5A5F]/10 p-3 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-[#FF5A5F] shrink-0 mt-0.5" />
              <div>
                <p className="font-display text-[10px] font-black uppercase tracking-widest text-[#FF5A5F]">
                  {readiness.redFlagSignals.length > 0 ? t("dashboard.safetyAlert") : t("dashboard.painAlert")}
                </p>
                <p className="text-[11px] text-on-surface/70 leading-relaxed mt-1">
                  {readiness.redFlagSignals.length > 0 ? t("dashboard.safetyAlertDesc") : t("dashboard.painAlertDesc")}
                </p>
              </div>
            </div>
          )}
        </section>

        {planAdjustments.length > 0 && (
          <section className="bg-surface-container border border-primary/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg border border-primary/50 text-primary flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] font-black uppercase tracking-widest text-primary">
                  {t("dashboard.planAdjustments")}
                </p>
                <ul className="space-y-2 mt-3">
                  {planAdjustments.map((note: string, noteIdx: number) => (
                    <li key={noteIdx} className="flex gap-2 text-xs leading-relaxed text-on-surface/75">
                      <span className="text-primary font-black">/</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Calendar and Weekly Nav */}
        <section className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-display font-black text-xl tracking-tight uppercase italic text-on-surface">{t("dashboard.microcycle")}</h3>
            <button
                onClick={() => setShowFocusModal(true)}
                disabled={isGenerating}
                className="shrink-0 px-3 py-1 bg-surface-container-high text-on-surface text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-surface-container-highest border border-outline transition-colors disabled:opacity-50"
                title={t("dashboard.regenerateTitle")}
              >
                {isGenerating ? t("dashboard.generating") : t("dashboard.regenerate")}
            </button>
          </div>
          <WeeklyCalendar 
            startDate={today}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            completedLogs={completedLogs}
          />
        </section>

        {/* Selected Day Training Details */}
        <section className="space-y-6">
          {!selectedWod ? (
            <div className="bg-surface-container-low rounded-xl p-8 border border-outline/30 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 opacity-50">
                <Dumbbell className="w-8 h-8 text-on-surface/50" />
              </div>
              <h4 className="font-display font-bold text-lg uppercase tracking-tight mb-2 text-on-surface/80">{t("dashboard.noplan")}</h4>
              <p className="text-xs text-outline mb-6">{t("dashboard.noplanDesc")}</p>
              <button 
                onClick={() => setShowFocusModal(true)}
                disabled={isGenerating}
                className="bg-primary text-on-primary font-display font-black text-xs px-6 py-4 rounded-xl uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 max-w-xs mx-auto disabled:opacity-50"
              >
                {isGenerating ? t("dashboard.generating") : t("dashboard.deployPlan")}
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {selectedWod.isRestDay ? (
                 <div className="bg-surface-container p-6 rounded-xl border border-outline/30 flex flex-col items-center justify-center min-h-[200px] text-center">
                   <span className="text-4xl mb-4 grayscale">🧘‍♂️</span>
                   <h4 className="font-display font-black text-xl tracking-tight uppercase mb-2">{t("dashboard.restDay")}</h4>
                   <p className="font-sans text-xs text-outline leading-relaxed max-w-[200px]">
                     {selectedWod.description || t("dashboard.restDayDesc")}
                   </p>
                   {selectedWod.coachNotes && selectedWod.coachNotes.length > 0 && (
                     <div className="mt-5 text-left w-full bg-surface/50 border border-outline/20 rounded-xl p-4">
                       <div className="flex items-center gap-2 mb-3">
                         <Brain className="w-4 h-4 text-primary" />
                         <p className="font-display text-[10px] font-black uppercase tracking-widest text-primary">
                           {t("dashboard.coachNotes")}
                         </p>
                       </div>
                       <ul className="space-y-2">
                         {selectedWod.coachNotes.map((note: string, noteIdx: number) => (
                           <li key={noteIdx} className="flex gap-2 text-xs leading-relaxed text-on-surface/75">
                             <span className="text-primary font-black">/</span>
                             <span>{note}</span>
                           </li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
              ) : (
                <div className={`bg-surface-container-highest p-6 rounded-xl ${isCompleted ? 'border-l-4 border-[#00E475]' : 'border-l-4 border-primary'} shadow-xl`}>
                  <div className="flex justify-between items-start mb-6 border-b border-outline/20 pb-4">
                    <div>
                      <span className={`font-display text-[10px] font-bold tracking-widest uppercase ${isCompleted ? 'text-[#00E475]' : 'text-primary'}`}>
                        {isCompleted ? t("dashboard.completedTag") : isToday ? t("dashboard.todayTag") : isPast ? t("dashboard.pastTag") : t("dashboard.upcomingTag")}
                      </span>
                      <h4 className="font-display font-black text-3xl tracking-tighter mt-1 italic uppercase line-clamp-2 leading-none">
                        {selectedWod.title}
                      </h4>
                      <p className="font-sans text-xs text-on-surface/60 mt-2">{selectedWod.phase} {selectedWod.description && `• ${selectedWod.description}`}</p>
                    </div>
                    {isCompleted ? (
                      <Check className="text-[#00E475] w-8 h-8" strokeWidth={3} />
                    ) : (
                      <Rocket className="text-primary w-8 h-8 opacity-80" strokeWidth={2} />
                    )}
                  </div>

                  {selectedWod.coachNotes && selectedWod.coachNotes.length > 0 && (
                    <div className="bg-surface/50 border border-outline/20 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-primary" />
                        <p className="font-display text-[10px] font-black uppercase tracking-widest text-primary">
                          {t("dashboard.coachNotes")}
                        </p>
                      </div>
                      <ul className="space-y-2">
                        {selectedWod.coachNotes.map((note: string, noteIdx: number) => (
                          <li key={noteIdx} className="flex gap-2 text-xs leading-relaxed text-on-surface/75">
                            <span className="text-primary font-black">/</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    {selectedWod.blocks.map((b: any, i: number) => (
                      <div key={i} className="flex flex-col bg-surface/50 p-3 rounded-lg border border-outline/20">
                        <span className="font-display text-[10px] text-outline font-bold uppercase mb-1">{b.type} • {b.format}</span>
                        <div className="flex justify-between items-start">
                          <span className="font-display font-bold text-sm tracking-tight">{b.name}</span>
                          {b.targetDuration && (
                            <span className="font-serif text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-outline">{b.targetDuration}m</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isCompleted ? (
                    <button 
                      onClick={() => router.push(`/workout/${selectedDateStr}`)}
                      className="w-full bg-surface-container text-on-surface font-display font-bold text-sm py-4 rounded-xl tracking-widest uppercase hover:bg-surface-container-high transition-colors border border-outline/30"
                    >
                      {t("dashboard.reviewLog")}
                    </button>
                  ) : isFuture ? (
                    <button 
                      onClick={() => router.push(`/workout/${selectedDateStr}`)}
                      className="w-full bg-surface-container text-outline font-display font-bold text-sm py-4 rounded-xl tracking-widest uppercase hover:bg-surface-container-high transition-colors border border-outline/30"
                    >
                      {t("dashboard.preview")} ({format(selectedDate, "MM/dd")})
                    </button>
                  ) : (
                    <button 
                      onClick={() => router.push(`/workout/${selectedDateStr}`)}
                      className="w-full bg-gradient-to-b from-[#FFE84D] to-[#FFDE00] text-on-primary font-display font-black text-sm py-4 rounded-xl tracking-widest uppercase active:scale-[0.98] transition-transform shadow-[0_10px_20px_rgba(255,222,0,0.15)]"
                    >
                      {t("dashboard.startEngine")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
        {/* Placeholder bottom spacing */}
        <div className="h-8"></div>
      </main>

      <BottomNavBar />

      {/* Focus Selector Modal */}
      {showFocusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-md border border-outline/30 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/5 to-transparent"></div>
            <h3 className="font-display font-black text-2xl uppercase italic mb-2 relative z-10 text-on-surface">{t("dashboard.focusTitle")}</h3>
            <p className="text-xs text-outline mb-6 relative z-10">{t("dashboard.focusDesc")}</p>
            
            <div className="space-y-3 relative z-10 mb-8">
              {[
                { id: "Balanced", label: t("dashboard.focusBalanced"), desc: t("dashboard.focusBalancedDesc") },
                { id: "Engine", label: t("dashboard.focusEngine"), desc: t("dashboard.focusEngineDesc") },
                { id: "Strength", label: t("dashboard.focusStrength"), desc: t("dashboard.focusStrengthDesc") },
                { id: "Transition", label: t("dashboard.focusTransition"), desc: t("dashboard.focusTransitionDesc") }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFocus(f.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedFocus === f.id ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(255,222,0,0.2)]' : 'bg-surface border-outline/20 hover:border-outline/50'}`}
                >
                  <div className={`font-display font-bold uppercase ${selectedFocus === f.id ? 'text-primary' : 'text-on-surface'}`}>{f.label}</div>
                  <div className="text-[10px] text-outline mt-1">{f.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 relative z-10">
              <button onClick={() => setShowFocusModal(false)} className="flex-1 py-3 rounded-xl border border-outline/30 text-outline font-bold text-xs uppercase hover:bg-surface-container">
                {t("dashboard.cancel")}
              </button>
              <button onClick={() => handleGeneratePlan(selectedFocus)} className="flex-[2] py-3 rounded-xl bg-primary text-on-primary font-display font-black text-sm uppercase px-4 shadow-[0_5px_15px_rgba(255,222,0,0.2)]">
                {isGenerating ? t("dashboard.generating") : t("dashboard.deploy")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
