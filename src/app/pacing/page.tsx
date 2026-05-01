"use client";

import { useEffect, useState, useRef } from "react";
import { FastForward, Flame, Flag, Activity, Timer, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTranslation } from "@/components/I18nProvider";
import { useTrainingStore } from "@/store/useTrainingStore";
import { deriveRunPrescriptions, formatPace, parseClockTime, type RunPrescription } from "@/lib/runPrescription";
import { isDemoMode } from "@/lib/demoMode";

// Proportional distribution heuristics for HYROX
const STATIONS = [
  { id: "SkiErg", name: "1000m SkiErg", weight: 0.05 },
  { id: "SledPush", name: "50m Sled Push", weight: 0.045 },
  { id: "SledPull", name: "50m Sled Pull", weight: 0.055 },
  { id: "Burpee", name: "80m Burpee Jumps", weight: 0.06 },
  { id: "Rowing", name: "1000m Rowing", weight: 0.05 },
  { id: "FarmersCarry", name: "200m Farmers Carry", weight: 0.04 },
  { id: "Sandbag", name: "100m Sandbag Lunges", weight: 0.06 },
  { id: "WallBalls", name: "Wall Balls", weight: 0.08 }
];

const WEIGHT_ROXZONE_TOTAL = 0.10;

export default function PacingEnginePage() {
  const { t } = useTranslation();
  const { prs, setPrs } = useTrainingStore();
  const [targetTimeStr, setTargetTimeStr] = useState("01:15:00");
  const [isGenerated, setIsGenerated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Breakdown states
  const [runPaceMs, setRunPaceMs] = useState(0); 
  const [roxzonePaceMs, setRoxzonePaceMs] = useState(0); 
  const [stationTimes, setStationTimes] = useState<Record<string, number>>({});
  const [runPrescriptions, setRunPrescriptions] = useState<RunPrescription[]>([]);

  useEffect(() => {
    async function loadPrs() {
      if (Object.keys(prs).length > 0) return;
      if (isDemoMode()) return;
      try {
        const res = await fetch("/api/sync");
        if (!res.ok) return;
        const data = await res.json();
        if (data.prs && Object.keys(data.prs).length > 0) setPrs(data.prs);
      } catch (error) {
        console.error(error);
      }
    }
    loadPrs();
  }, [prs, setPrs]);

  const handleGenerate = () => {
    const totalMs = parseClockTime(targetTimeStr);
    if (totalMs < 1000 * 60 * 30 || totalMs > 1000 * 60 * 300) {
      alert(t("pacing.invalidTime"));
      return;
    }

    const nextRunPrescriptions = deriveRunPrescriptions({
      targetTimeMs: totalMs,
      run1kmPrMs: prs.Run1km,
    });
    const racePrescription = nextRunPrescriptions.find((item) => item.label === "race") || nextRunPrescriptions[1];

    setRunPaceMs(racePrescription.paceMsPerKm);
    setRunPrescriptions(nextRunPrescriptions);
    setRoxzonePaceMs(Math.floor((totalMs * WEIGHT_ROXZONE_TOTAL) / 8));

    const stationsMsMap: Record<string, number> = {};
    STATIONS.forEach(s => {
      stationsMsMap[s.id] = Math.floor(totalMs * s.weight);
    });
    setStationTimes(stationsMsMap);
    setIsGenerated(true);
  };

  const exportPoster = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: '#131313',
        scale: 2, 
        ignoreElements: (el) => el.hasAttribute('data-export-hide'),
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `kinetic_pacing_${targetTimeStr.replace(/:/g, '')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      alert(t("pacing.exportError"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-background text-on-background antialiased pb-24 min-h-screen">
      {/* TopAppBar Shell */}
      <header className="bg-[#131313] fixed top-0 w-full z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-none mx-auto" data-export-hide>
          <div className="flex items-center gap-2 active:scale-95 transition-transform cursor-pointer">
            <Flame className="text-primary w-6 h-6 fill-primary" />
            <h1 className="font-display font-black tracking-tighter uppercase text-2xl text-primary italic">FORGE <span className="text-on-surface">/ PACE</span></h1>
          </div>
          {isGenerated && (
            <button
              onClick={exportPoster}
              disabled={isExporting}
              className="px-3 py-1 bg-surface-container-high rounded-lg text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 active:scale-95 transition-transform border border-outline/30 text-primary"
            >
              <Download className="w-3 h-3" /> {isExporting ? t("pacing.exporting") : t("pacing.exportPoster")}
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 px-6 space-y-8 max-w-2xl mx-auto" ref={printRef}>
        <section className="text-center pb-4 border-b border-outline/20">
          <div className="flex justify-center mb-6 opacity-20 rotate-12" data-export-show>
             <Flame className="w-16 h-16 fill-primary pointer-events-none" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold italic uppercase font-display text-on-surface tracking-tighter mb-2">
            {t("pacing.heading")}
          </h2>
          <p className="font-sans text-xs text-outline max-w-sm mx-auto leading-relaxed">
            {t("pacing.headingDesc")}
          </p>
        </section>

        {/* Target Time Setting */}
        <section className="bg-surface-container rounded-xl p-6 border border-outline/20 flex flex-col items-center gap-4">
          <label className="text-[10px] font-bold text-outline uppercase tracking-widest font-display">{t("pacing.targetLabel")}</label>
          <input
             type="text"
             value={targetTimeStr}
             onChange={(e) => setTargetTimeStr(e.target.value.replace(/[^0-9:]/g, ""))}
             className="w-full text-center bg-transparent border-none text-5xl font-black font-mono tracking-tighter text-primary placeholder:text-outline focus:ring-0 p-0"
             placeholder="01:15:00"
          />
          <button
             onClick={handleGenerate}
             data-export-hide
             className="w-full mt-4 kinetic-gradient text-on-primary font-display font-black text-sm py-4 rounded-xl tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(255,222,0,0.15)]"
          >
             {t("pacing.calculate")}
          </button>
        </section>

        {/* Results Layout */}
        {isGenerated && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h3 className="font-display font-black text-xl tracking-tight uppercase italic text-on-surface flex items-center mb-6">
              <Flag className="w-5 h-5 mr-3 text-primary" strokeWidth={2.5} /> {t("pacing.pacingLine")}
            </h3>
            
            <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-5 before:-ml-px before:w-0.5 before:bg-outline/20 before:z-0">
              
              {/* Runway Base Pace */}
              <div className="relative flex items-center pl-16 py-4 bg-surface-container rounded-xl border border-outline/20 shadow-xl overflow-hidden group">
                 <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                 <div className="absolute left-[-0.3rem] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-container-high ring-4 ring-background flex items-center justify-center z-10 shadow-lg">
                   <Activity className="w-5 h-5 text-blue-400" />
                 </div>
                 <div className="flex-1 pr-6 flex justify-between items-center">
                   <div>
                     <span className="font-display text-[10px] uppercase font-bold tracking-widest text-outline block mb-1">{t("pacing.runLabel")}</span>
                     <h4 className="font-display font-black uppercase tracking-tight text-lg leading-none">{t("pacing.run8x")}</h4>
                   </div>
                   <div className="text-right">
                     <p className="font-mono text-2xl font-black text-on-surface leading-none">{formatPace(runPaceMs)}</p>
                     <p className="font-display text-xs text-outline font-bold mt-1">MIN/KM</p>
                   </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {runPrescriptions.map((item) => (
                  <div key={item.label} className="bg-surface-container-low border border-outline/10 rounded-xl p-4">
                    <span className="font-display text-[9px] uppercase tracking-widest font-black text-outline block mb-1">{item.label}</span>
                    <p className="font-mono text-xl font-black text-primary leading-none">{formatPace(item.paceMsPerKm)}</p>
                    <p className="text-[10px] text-on-surface/50 leading-relaxed mt-2">{item.purpose}</p>
                  </div>
                ))}
              </div>

              {/* Transition Pace */}
              <div className="relative flex items-center pl-16 py-4 bg-surface-container rounded-xl border border-outline/20 shadow-xl overflow-hidden">
                 <div className="absolute inset-y-0 left-0 w-1 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                 <div className="absolute left-[-0.3rem] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-container-high ring-4 ring-background flex items-center justify-center z-10 shadow-lg">
                   <Timer className="w-5 h-5 text-purple-400" />
                 </div>
                 <div className="flex-1 pr-6 flex justify-between items-center">
                   <div>
                     <span className="font-display text-[10px] uppercase font-bold tracking-widest text-outline block mb-1">{t("pacing.roxzoneLabel")}</span>
                     <h4 className="font-display font-black uppercase tracking-tight text-lg leading-none">{t("pacing.roxzone8x")}</h4>
                   </div>
                   <div className="text-right">
                     <p className="font-mono text-2xl font-black text-on-surface leading-none">{formatPace(roxzonePaceMs)}</p>
                     <p className="font-display text-xs text-outline font-bold mt-1">MIN/CYCLE</p>
                   </div>
                 </div>
              </div>

              <h4 className="font-display font-black text-sm text-outline tracking-wider uppercase mt-8 mb-4 pl-[3.5rem]">{t("pacing.stationSection")}</h4>

              {/* individual Stations Pace */}
              <div className="space-y-3">
                {STATIONS.map((station, idx) => (
                  <div key={station.id} className="relative flex items-center pl-[3.5rem] py-3 bg-surface-container-low rounded-xl border border-outline/10 hover:border-primary/50 transition-colors z-10">
                    <div className="absolute left-[0.2rem] w-6 h-6 rounded-md bg-surface border border-outline/30 flex items-center justify-center text-[10px] font-black text-outline">
                      {idx + 1}
                    </div>
                    <div className="flex-1 flex justify-between items-center pr-4">
                      <div className="font-display font-bold text-sm tracking-tight text-on-surface uppercase">{station.name}</div>
                      <div className="text-lg font-mono font-black text-primary drop-shadow-md">{formatPace(stationTimes[station.id])}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 text-center" data-export-hide={false}>
               <p className="text-[9px] text-outline font-display font-bold uppercase tracking-[0.3em]">
                 {t("pacing.poweredBy")}
               </p>
            </div>
          </div>
        )}
      </main>

      <BottomNavBar />
    </div>
  );
}
