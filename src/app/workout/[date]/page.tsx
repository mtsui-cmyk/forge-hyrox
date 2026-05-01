"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTrainingStore, BlockLog, DailyLog, WOD } from "@/store/useTrainingStore";
import { ArrowLeft, CheckCircle, Timer, Activity, Play, Square, RotateCcw, Edit3, Save, RefreshCw, X, Flame } from "lucide-react";
import { useTranslation } from "@/components/I18nProvider";
import { normalizeTrainingPlan, normalizeTrainingPlanArray } from "@/lib/trainingPlan";
import {
  buildLocalSubstitution,
  DEFAULT_EQUIPMENT_AVAILABILITY,
  EQUIPMENT_LABELS,
  EquipmentAvailability,
  EquipmentKey,
  getMissingEquipment,
} from "@/lib/equipmentSubstitutions";

export default function WorkoutDayPage() {
  const router = useRouter();
  const params = useParams();
  const dateStr = params.date as string;

  const { microcycle, completedLogs, logWorkoutResult, updateWod, setMicrocycle } = useTrainingStore();
  const { lang, t } = useTranslation();
  const wod = microcycle[dateStr];
  const existingLog = completedLogs[dateStr];
  const [isRestoringWod, setIsRestoringWod] = useState(false);
  const [hasTriedRestoringWod, setHasTriedRestoringWod] = useState(false);

  const [isEditingWod, setIsEditingWod] = useState(false);
  const [editedWod, setEditedWod] = useState<WOD | null>(null);

  const [swappingBlockIdx, setSwappingBlockIdx] = useState<number | null>(null);
  const [missingEqText, setMissingEqText] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  useEffect(() => {
    if (wod && !editedWod) {
      setEditedWod(JSON.parse(JSON.stringify(wod)));
    }
  }, [wod, editedWod]);

  useEffect(() => {
    async function restoreWodFromDb() {
      if (wod || hasTriedRestoringWod || isRestoringWod) return;
      setIsRestoringWod(true);
      try {
        const res = await fetch("/api/sync");
        if (!res.ok) throw new Error("Failed to restore WOD");
        const data = await res.json();
        if (data.microcycle) {
          setMicrocycle(normalizeTrainingPlanArray(data.microcycle) as any);
        }
        if (data.completedLogs) {
          for (const [date, log] of Object.entries(data.completedLogs)) {
            useTrainingStore.getState().logWorkoutResult(date, log as any);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setHasTriedRestoringWod(true);
        setIsRestoringWod(false);
      }
    }

    restoreWodFromDb();
  }, [wod, hasTriedRestoringWod, isRestoringWod, setMicrocycle]);

  const [logs, setLogs] = useState<Record<number, BlockLog>>(existingLog?.blockLogs || {});
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [showRpeModal, setShowRpeModal] = useState(false);
  const [rpe, setRpe] = useState<number>(8);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [todayEquipment, setTodayEquipment] = useState<EquipmentAvailability>(DEFAULT_EQUIPMENT_AVAILABILITY);

  useEffect(() => {
    try {
      const savedToday = localStorage.getItem(`hyroxTodayEquipment:${dateStr}`);
      const savedDefault = localStorage.getItem("hyroxEquipment");
      const parsed = savedToday ? JSON.parse(savedToday) : savedDefault ? JSON.parse(savedDefault) : {};
      setTodayEquipment({ ...DEFAULT_EQUIPMENT_AVAILABILITY, ...parsed });
    } catch {
      setTodayEquipment(DEFAULT_EQUIPMENT_AVAILABILITY);
    }
  }, [dateStr]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setElapsedTime(prev => prev + 100), 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatStopwatch = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    const msStr = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${mins}:${secs}.${msStr}`;
  };

  const handleUpdateLog = (idx: number, field: keyof BlockLog, value: any) => {
    setLogs((prev) => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value }
    }));
  };

  const submitLog = async () => {
    setIsSavingLog(true);
    const totalTimeMsFromLogs = Object.values(logs).reduce((acc, log) => acc + (log.timeTakenMs || 0), 0);
    const finalTotalTime = totalTimeMsFromLogs > 0 ? totalTimeMsFromLogs : elapsedTime;

    const dailyLog: DailyLog = {
      date: dateStr,
      totalTimeMs: finalTotalTime,
      blockLogs: logs,
      completedAt: new Date().toISOString(),
      rpe
    };
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedLogs: { [dateStr]: dailyLog } }),
      });
      if (!res.ok) throw new Error("Failed to sync workout log");
      logWorkoutResult(dateStr, dailyLog);
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      alert(t("workout.syncError"));
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleSaveEditedWod = async () => {
    if (editedWod) {
      updateWod(dateStr, editedWod);
      syncMicrocycle(editedWod);
      setIsEditingWod(false);
    }
  };

  const syncMicrocycle = (updatedWod: WOD) => {
    const nextCycle = normalizeTrainingPlan({
      ...useTrainingStore.getState().microcycle,
      [dateStr]: updatedWod,
    });
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ microcycle: nextCycle }),
    }).catch(e => console.error("Background sync failed", e));
  };

  const toggleTodayEquipment = (key: EquipmentKey) => {
    setTodayEquipment((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`hyroxTodayEquipment:${dateStr}`, JSON.stringify(next));
      return next;
    });
  };

  const applyLocalSubstitution = (idx: number) => {
    const baseWod = editedWod || wod;
    const replacement = buildLocalSubstitution(baseWod.blocks[idx] as any, todayEquipment, lang === "zh" ? "zh" : "en");
    if (!replacement) return;

    const updatedWod = {
      ...baseWod,
      blocks: baseWod.blocks.map((block, blockIdx) => blockIdx === idx ? replacement : block),
    } as WOD;

    setEditedWod(updatedWod);
    updateWod(dateStr, updatedWod);
    syncMicrocycle(updatedWod);
  };

  const handleUpdateWodBlock = (blockIdx: number, field: string, value: any) => {
    if (!editedWod) return;
    const newWod = { ...editedWod };
    newWod.blocks[blockIdx] = { ...newWod.blocks[blockIdx], [field]: value };
    setEditedWod(newWod);
  };

  const handleUpdateWodDetail = (blockIdx: number, detailIdx: number, value: string) => {
    if (!editedWod) return;
    const newWod = { ...editedWod };
    newWod.blocks[blockIdx].details[detailIdx] = value;
    setEditedWod(newWod);
  };

  const formatSecToTimeInput = (ms?: number) => {
    if (!ms) return "";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const parseTimeInputToMs = (val: string) => {
    if (!val) return undefined;
    const parts = val.split(":");
    if (parts.length === 2) {
      const m = parseInt(parts[0]) || 0;
      const s = parseInt(parts[1]) || 0;
      return (m * 60 + s) * 1000;
    }
    return undefined;
  };

  const executeSwap = async (idx: number) => {
    if (!missingEqText) return;
    setIsSwapping(true);
    try {
      const baseWod = editedWod || wod;
      const profileRes = await fetch("/api/sync");
      if (!profileRes.ok) throw new Error("Failed to fetch profile");
      const { profileData } = await profileRes.json();

      const res = await fetch("/api/generate-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profileData.profile,
          missingEquipment: missingEqText,
          originalBlock: baseWod.blocks[idx],
          wodContext: { title: baseWod.title, description: baseWod.description },
          lang,
        }),
      });
      if (!res.ok) throw new Error("Failed to swap");
      const newBlock = await res.json();
      
      const updatedWod = {
        ...baseWod,
        blocks: baseWod.blocks.map((block, blockIdx) => blockIdx === idx ? newBlock : block),
      } as WOD;
      
      setEditedWod(updatedWod);
      updateWod(dateStr, updatedWod);
      syncMicrocycle(updatedWod);

      setSwappingBlockIdx(null);
      setMissingEqText("");
    } catch (e) {
      console.error(e);
      alert(t("workout.swapError"));
    } finally {
      setIsSwapping(false);
    }
  };

  if (!wod && isRestoringWod) {
    return (
      <main className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
         <div className="animate-spin w-10 h-10 border-4 border-surface-container-high border-t-primary rounded-full mb-4" />
	         <h2 className="text-lg font-black font-display text-on-surface uppercase">{t("workout.restoring")}</h2>
      </main>
    );
  }

  if (!wod) {
    return (
      <main className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
	         <h2 className="text-2xl font-black font-display text-on-surface uppercase mb-4">{t("workout.notFound")}</h2>
	         <button onClick={() => router.push("/dashboard")} className="font-display font-bold text-[10px] uppercase text-primary tracking-widest px-4 py-2 border border-primary rounded-lg">{t("workout.goHome")}</button>
      </main>
    );
  }

  return (
    <div className="bg-background text-on-background antialiased pb-24 min-h-screen">
      {/* TopAppBar Shell */}
      <header className="bg-[#131313] fixed top-0 w-full z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-b border-outline/10">
        <div className="flex justify-between items-center px-4 h-16 max-w-2xl mx-auto">
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center text-on-surface/60 hover:text-primary transition-colors pr-4 py-2"
	            aria-label={t("workout.back")}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex flex-col items-center">
             <div className="flex gap-1 items-center">
                <Flame className="w-3 h-3 text-primary fill-primary" />
	                <span className="font-display font-black text-sm tracking-widest uppercase italic text-on-surface">{t("workout.title")}</span>
             </div>
             <span className="font-mono text-[10px] text-outline tracking-widest">{dateStr}</span>
          </div>

          <div className="w-[40px]">
            {/* Empty block to center title */}
          </div>
        </div>
      </header>

      <main className="pt-24 px-4 space-y-8 max-w-2xl mx-auto">

        {/* Stopwatch Engine UI */}
        {!existingLog && !wod.isRestDay && (
          <section className="bg-surface-container rounded-2xl shadow-xl overflow-hidden relative border border-outline/30 pb-6 pt-8 flex flex-col items-center group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
	            <span className="font-display text-[10px] font-bold uppercase tracking-[0.3em] text-outline mb-4">{t("workout.criticalTimer")}</span>
            
            <h2 className="text-6xl font-black font-mono tracking-tighter text-primary mb-8 relative z-10 drop-shadow-[0_0_15px_rgba(255,222,0,0.3)] tabular-nums">
              {formatStopwatch(elapsedTime)}
            </h2>
            
            <div className="flex gap-6 relative z-10 px-6 w-full justify-center">
              {!isRunning ? (
                <button 
                  onClick={() => setIsRunning(true)}
                  className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-yellow-400 transition-transform active:scale-90 shadow-[0_10px_20px_rgba(255,222,0,0.3)]"
	                  aria-label={t("workout.startTimer")}
                >
                  <Play className="w-8 h-8 ml-1" />
                </button>
              ) : (
                <button 
                  onClick={() => setIsRunning(false)}
                  className="w-16 h-16 rounded-full bg-red-600 border border-red-500 text-white flex items-center justify-center hover:bg-red-500 transition-transform active:scale-90 shadow-[0_10px_20px_rgba(220,38,38,0.4)]"
	                  aria-label={t("workout.stopTimer")}
                >
                  <Square className="w-6 h-6" />
                </button>
              )}
              
              <button 
                onClick={() => { setIsRunning(false); setElapsedTime(0); }}
                disabled={elapsedTime === 0}
                className="w-16 h-16 rounded-full bg-surface-container-high border border-outline/30 text-on-surface flex items-center justify-center hover:bg-surface-container-highest disabled:opacity-30 transition-transform active:scale-90"
	                aria-label={t("workout.resetTimer")}
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </section>
        )}

        {/* WOD Header */}
        <section className="relative">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-4xl font-extrabold tracking-tighter uppercase italic font-display">{wod.title}</h2>
            
            {!existingLog && !wod.isRestDay && (
              <button 
                onClick={() => isEditingWod ? handleSaveEditedWod() : setIsEditingWod(true)}
                className={`p-2 rounded-lg text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 transition-colors border ${
                  isEditingWod ? 'bg-[#00E475]/10 text-[#00E475] border-[#00E475]/50' : 'bg-surface-container text-outline border-outline/30 hover:text-on-surface'
                }`}
              >
                {isEditingWod ? (
	                  <><Save className="w-3 h-3" /> {t("workout.saveShort")}</>
	                ) : (
	                  <><Edit3 className="w-3 h-3" /> {t("workout.editShort")}</>
                )}
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-1 items-start">
	             <span className="font-display text-[10px] uppercase font-bold tracking-widest text-primary border border-primary px-1.5 py-0.5 rounded-sm">{t("workout.phase")}: {wod.phase}</span>
             <p className="text-xs text-outline">{wod.description}</p>
          </div>

          {existingLog?.rpe && (
            <div className="mt-4 inline-flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline/20">
	              <span className="font-display text-[10px] uppercase text-outline font-bold tracking-widest">{t("workout.fatigue")}:</span>
              <span className="font-mono font-bold text-primary">RPE {existingLog.rpe}/10</span>
            </div>
          )}
        </section>

        {!existingLog && !wod.isRestDay && (
          <section className="bg-surface-container-low rounded-xl border border-outline/20 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
	                <p className="font-display text-[10px] text-outline font-bold uppercase tracking-widest mb-1">{t("workout.todayGym")}</p>
	                <h3 className="font-display text-lg font-black uppercase italic tracking-tight text-on-surface">{t("workout.equipmentAvailability")}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTodayEquipment(DEFAULT_EQUIPMENT_AVAILABILITY);
                  localStorage.removeItem(`hyroxTodayEquipment:${dateStr}`);
                }}
                className="shrink-0 px-3 py-2 rounded-lg border border-outline/20 text-[10px] font-bold uppercase tracking-widest text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
	                {t("workout.reset")}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(EQUIPMENT_LABELS) as EquipmentKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTodayEquipment(key)}
                  className={`px-3 py-3 rounded-lg text-left border transition-colors ${
                    todayEquipment[key]
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-surface border-outline/20 text-on-surface/40"
                  }`}
                >
                  <span className="block font-display text-[10px] font-black uppercase tracking-widest">
                    {EQUIPMENT_LABELS[key]}
                  </span>
                  <span className="block text-[9px] mt-1 font-bold uppercase tracking-wider">
	                    {todayEquipment[key] ? t("workout.available") : t("workout.missing")}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Blocks rendering */}
        <section className="space-y-4">
          {(editedWod || wod).blocks.map((block, idx) => {
            const log = logs[idx] || {};
            const isTimeBased = block.format === "For Time" || block.format === "Relax";
            const isRepBased = block.format === "EMOM" || block.format === "AMRAP" || block.format === "Rounds" || block.format === "ROUNDS";
            const missingEquipment = getMissingEquipment(block as any, todayEquipment);

            return (
              <div key={idx} className={`bg-surface-container p-4 rounded-xl border transition-colors ${isEditingWod ? 'border-primary/50' : 'border-outline/20'}`}>
                
                <div className="flex justify-between items-center border-b border-outline/20 pb-3 mb-3">
                  {isEditingWod ? (
                    <div className="flex-1 mr-4">
                      <input 
                        type="text" 
                        value={block.name}
	                        placeholder={t("workout.blockNamePlaceholder")}
                        onChange={(e) => handleUpdateWodBlock(idx, 'name', e.target.value)}
                        className="w-full bg-surface-container-high border-none rounded p-2 text-primary font-bold text-sm focus:ring-0 focus:outline-none placeholder:text-outline"
                      />
                    </div>
                  ) : (
                    <h3 className="font-bold text-on-surface uppercase text-[12px] tracking-widest font-display">
                      <span className="text-primary">{block.type}</span> / {block.name}
                    </h3>
                  )}
                  <span className="font-mono text-[9px] bg-surface uppercase font-bold px-2 py-1 rounded text-outline border border-outline/10 shrink-0 select-none">
                    {block.format}
                  </span>
                </div>
                
                <ul className="space-y-2 text-sm text-on-surface/80 pb-4 mb-2 border-b border-outline/10">
                  {block.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex gap-2 items-start">
                      <span className="text-primary mt-1 opacity-70">/</span>
                      {isEditingWod ? (
                        <input 
                          type="text" 
                          value={detail}
	                          placeholder={t("workout.movementPlaceholder")}
                          onChange={(e) => handleUpdateWodDetail(idx, dIdx, e.target.value)}
                          className="flex-1 bg-surface-container-high border-none rounded p-1 text-on-surface text-sm focus:ring-0 focus:outline-none"
                        />
                      ) : (
                        <span>{detail}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {!existingLog && !isEditingWod && missingEquipment.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                    <p className="font-display text-[10px] uppercase tracking-widest font-black text-red-400 mb-2">
	                      {t("workout.missingToday")}: {missingEquipment.map((item) => EQUIPMENT_LABELS[item]).join(", ")}
                    </p>
                    <p className="text-xs text-on-surface/70 leading-relaxed mb-3">
	                      {t("workout.localSubstitutionDesc")}
                    </p>
                    <button
                      type="button"
                      onClick={() => applyLocalSubstitution(idx)}
                      className="w-full py-3 rounded-lg bg-primary text-on-primary font-display font-black text-xs uppercase tracking-widest"
                    >
	                      {t("workout.applyLocalSubstitution")}
                    </button>
                  </div>
                )}

                {/* Logger Inputs */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {isTimeBased ? (
                    <div className="col-span-2">
	                      <label className="font-display text-[9px] font-bold text-outline uppercase tracking-widest mb-1.5 block">{t("workout.duration")}</label>
                      <div className="relative">
                        <Timer className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                        <input 
                          type="text" 
                          placeholder="00:00"
                          value={formatSecToTimeInput(log.timeTakenMs)}
                          onChange={(e) => handleUpdateLog(idx, 'timeTakenMs', parseTimeInputToMs(e.target.value))}
                          disabled={!!existingLog}
                          className="w-full bg-surface-container-high border border-outline/10 rounded-lg py-3 pl-10 pr-3 text-on-surface focus:outline-none focus:border-primary disabled:opacity-50 font-mono shadow-inner"
                        />
                      </div>
                    </div>
                  ) : isRepBased ? (
                    <>
                      <div className="col-span-1">
	                        <label className="font-display text-[9px] font-bold text-outline uppercase tracking-widest mb-1.5 block">{t("workout.totalRepsRounds")}</label>
                        <div className="relative">
                          <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                          <input 
                            type="number" 
                            placeholder="0"
                            value={log.repsCompleted || ""}
                            onChange={(e) => handleUpdateLog(idx, 'repsCompleted', parseInt(e.target.value) || undefined)}
                            disabled={!!existingLog}
                            className="w-full bg-surface-container-high border border-outline/10 rounded-lg py-3 pl-10 pr-3 text-on-surface focus:outline-none focus:border-primary disabled:opacity-50 font-mono shadow-inner"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
	                        <label className="font-display text-[9px] font-bold text-outline uppercase tracking-widest mb-1.5 block">{t("workout.timeOptional")}</label>
                        <input 
                          type="text" 
                          placeholder="00:00"
                          value={formatSecToTimeInput(log.timeTakenMs)}
                          onChange={(e) => handleUpdateLog(idx, 'timeTakenMs', parseTimeInputToMs(e.target.value))}
                          disabled={!!existingLog}
                          className="w-full bg-surface-container-high border border-outline/10 rounded-lg py-3 px-3 text-on-surface focus:outline-none focus:border-primary disabled:opacity-50 font-mono shadow-inner text-center"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2">
	                       <label className="font-display text-[9px] font-bold text-outline uppercase tracking-widest mb-1.5 block">{t("workout.notesWeight")}</label>
                       <input 
                          type="text" 
	                          placeholder={t("workout.notesPlaceholder")}
                          value={log.notes || ""}
                          onChange={(e) => handleUpdateLog(idx, 'notes', e.target.value)}
                          disabled={!!existingLog}
                          className="w-full bg-surface-container-high border border-outline/10 rounded-lg py-3 px-4 text-on-surface font-sans text-sm focus:outline-none focus:border-primary disabled:opacity-50 shadow-inner"
                        />
                    </div>
                  )}
                </div>

                {/* AI Eq Swap */}
                {!existingLog && !isEditingWod && (
                  <div className="pt-4 mt-4 border-t border-outline/10">
                    {swappingBlockIdx === idx ? (
                      <div className="bg-surface-container-high p-4 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
	                        <label className="text-[10px] font-bold tracking-widest text-primary uppercase mb-3 block font-display">{t("workout.missingEquipmentLabel")}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={missingEqText}
                            onChange={(e) => setMissingEqText(e.target.value)}
	                            placeholder={t("workout.missingEquipmentPlaceholder")}
                            className="flex-1 bg-surface-container font-sans text-sm text-on-surface px-3 py-2 rounded-lg focus:outline-none border border-outline/30 placeholder:text-outline"
                            disabled={isSwapping}
                          />
                          <button
                            onClick={() => executeSwap(idx)}
                            disabled={isSwapping || !missingEqText}
                            className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-opacity-80 transition-colors flex items-center shadow-lg"
                          >
	                            {isSwapping ? <RefreshCw className="w-4 h-4 animate-spin" /> : t("workout.swap")}
                          </button>
                          <button
                            onClick={() => setSwappingBlockIdx(null)}
                            disabled={isSwapping}
                            className="text-outline hover:text-on-surface px-2 transition-colors"
	                            aria-label={t("common.cancel")}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setSwappingBlockIdx(idx); setMissingEqText(""); }}
                          className="font-display text-[9px] font-bold uppercase tracking-widest text-outline hover:text-primary flex items-center gap-1.5 transition-colors border-b border-transparent hover:border-primary pb-0.5"
                        >
                          <RefreshCw className="w-3 h-3" />
	                          {t("workout.requestSwap")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {!existingLog && !wod.isRestDay && (
          <button 
            onClick={() => setShowRpeModal(true)}
            className="w-full mt-8 py-5 kinetic-gradient text-on-primary font-black font-display text-base tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_20px_40px_rgba(255,222,0,0.2)] hover:scale-[1.02] active:scale-[0.98] sticky bottom-6 z-20"
          >
            <CheckCircle className="w-5 h-5 mr-1" />
	            {t("workout.commitLog")}
          </button>
        )}
      </main>

      {/* RPE Modal Overlay */}
      {showRpeModal && (
        <div className="fixed inset-0 bg-[#0A0A0A]/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md">
          <div className="w-full max-w-sm bg-surface-container-high p-8 rounded-3xl border border-outline/30 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="text-center space-y-2 relative z-10">
	              <span className="font-display font-bold text-[10px] uppercase tracking-widest text-outline">{t("workout.postWorkoutDebrief")}</span>
	              <h2 className="text-3xl font-black italic uppercase font-display text-on-surface tracking-tighter">{t("workout.rateFatigue")}</h2>
            </div>
            
            <div className="flex flex-col items-center space-y-8 relative z-10">
              <div className="text-7xl font-black font-mono text-primary tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(255,222,0,0.4)]">
                {rpe}<span className="text-3xl text-outline ml-1">/10</span>
              </div>
              <input 
                type="range" 
                min="1" max="10" 
                value={rpe} 
                onChange={(e) => setRpe(parseInt(e.target.value))}
	                title={t("rpe.title")}
                className="w-full accent-primary h-2 bg-surface-container rounded-lg appearance-none cursor-pointer outline-none"
              />
              <div className="flex justify-between w-full text-[9px] text-outline font-bold uppercase tracking-widest font-display">
	                <span>{t("workout.lightEffort")}</span>
	                <span>{t("workout.maxEffort")}</span>
              </div>
            </div>

            <div className="space-y-3 relative z-10 pt-4 border-t border-outline/10">
               <button 
                 onClick={submitLog}
                 disabled={isSavingLog}
                 className="w-full py-4 kinetic-gradient text-on-primary font-black font-display uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm shadow-[0_10px_20px_rgba(255,222,0,0.2)]"
               >
	                 {isSavingLog ? t("workout.syncing") : t("workout.finalizeSync")}
               </button>
               <button 
                 onClick={() => setShowRpeModal(false)}
                 className="w-full py-4 bg-transparent text-outline font-bold uppercase tracking-widest font-display text-xs hover:text-on-surface transition-colors rounded-xl"
               >
	                 {t("common.cancel")}
               </button>
            </div>
            
            <div className="absolute -bottom-10 -right-10 opacity-5 blur-[2px] pointer-events-none z-0">
               <Flame className="w-48 h-48 fill-primary" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
