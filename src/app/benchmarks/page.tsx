"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Clock, Target, Flame } from "lucide-react";
import { useTrainingStore } from "@/store/useTrainingStore";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTranslation } from "@/components/I18nProvider";

const STATION_IDS = [
  { id: "Run1km",       name: "1000m Run",            noteKey: "Run1km" },
  { id: "SkiErg",       name: "1000m SkiErg",         noteKey: null },
  { id: "SledPush",     name: "50m Sled Push",         noteKey: "SledPush" },
  { id: "SledPull",     name: "50m Sled Pull",         noteKey: "SledPull" },
  { id: "Burpee",       name: "80m Burpee Broad Jumps",noteKey: null },
  { id: "Rowing",       name: "1000m Rowing",          noteKey: null },
  { id: "FarmersCarry", name: "200m Farmers Carry",    noteKey: "FarmersCarry" },
  { id: "Sandbag",      name: "100m Sandbag Lunges",   noteKey: null },
  { id: "WallBalls",    name: "75/100 Wall Balls",      noteKey: null },
];

const formatMsToTime = (ms: number | undefined) => {
  if (!ms) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const parseTimeToMs = (timeStr: string) => {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return (mins * 60 + secs) * 1000;
  }
  return 0;
};

const calculateScore = (stationId: string, ms?: number) => {
  if (!ms || ms === 0) return 3;
  const s = ms / 1000;
  const baselines: Record<string, [number, number]> = {
    Run1km: [210, 420], SkiErg: [210, 360], SledPush: [60, 180],
    SledPull: [60, 180], Burpee: [120, 300], Rowing: [210, 360],
    FarmersCarry: [90, 180], Sandbag: [180, 300], WallBalls: [210, 360],
  };
  const [elite, beginner] = baselines[stationId] || [120, 300];
  if (s <= elite) return 100;
  if (s >= beginner) return 10;
  return Math.round(100 - ((s - elite) / (beginner - elite)) * 90);
};

export default function BenchmarksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { prs, updatePR, setPrs } = useTrainingStore();
  const [localPrs, setLocalPrs] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadPrsFromDb() {
      const hasPrs = Object.keys(prs).length > 0;
      if (hasPrs) { setIsLoading(false); return; }
      try {
        const res = await fetch("/api/sync");
        if (res.ok) {
          const data = await res.json();
          if (data.prs && Object.keys(data.prs).length > 0) setPrs(data.prs);
        }
      } catch (e) { /* silent */ }
      setIsLoading(false);
    }
    loadPrsFromDb();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const initLocal: Record<string, string> = {};
    STATION_IDS.forEach(st => { initLocal[st.id] = formatMsToTime(prs[st.id]); });
    setLocalPrs(initLocal);
  }, [prs]);

  const handlePrChange = (stationId: string, value: string) => {
    const sanitized = value.replace(/[^0-9:]/g, "");
    setLocalPrs(prev => ({ ...prev, [stationId]: sanitized }));
    const timeMs = parseTimeToMs(sanitized);
    if (timeMs > 0) {
      updatePR(stationId, timeMs);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      setIsSyncing(true);
      syncTimeoutRef.current = setTimeout(() => { syncToDb({ [stationId]: timeMs }); }, 1500);
    }
  };

  const syncToDb = async (prPayload: Record<string, number>) => {
    try {
      await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prs: prPayload }) });
    } catch (e) { console.error(e); } finally { setIsSyncing(false); }
  };

  return (
    <div className="bg-background text-on-background antialiased pb-24 min-h-screen">
      <header className="bg-[#131313] fixed top-0 w-full z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center px-6 h-16 w-full max-w-none mx-auto">
          <div className="flex items-center gap-2 active:scale-95 transition-transform cursor-pointer">
            <Flame className="text-primary w-6 h-6 fill-primary" />
            <h1 className="font-display font-black tracking-tighter uppercase text-2xl text-primary italic">FORGE <span className="text-on-surface">/ LOGS</span></h1>
          </div>
          {isSyncing && (
            <span className="text-xs text-primary font-bold tracking-widest uppercase flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3" /> {t("benchmarks.syncing")}
            </span>
          )}
        </div>
      </header>

      <main className="pt-24 px-6 space-y-8 max-w-2xl mx-auto">
        <section className="text-center">
          <h2 className="text-4xl font-extrabold italic uppercase tracking-tighter mb-2 font-display">
            {t("benchmarks.heading")}
          </h2>
          <p className="font-sans text-xs text-outline max-w-sm mx-auto">
            {t("benchmarks.desc")}
          </p>
        </section>

        {/* Radar Map */}
        <section className="bg-surface-container-low rounded-xl p-4 border border-outline/30 shadow-xl overflow-hidden relative min-h-[300px] flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
          <p className="absolute left-4 top-4 text-xs font-black italic uppercase text-outline font-display opacity-50 select-none">
            {t("benchmarks.radar")}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="50%" outerRadius="65%"
              data={STATION_IDS.map(s => ({
                subject: s.name.replace(/[a-zA-Z0-9\s/]/g, '').trim() || s.id.substring(0,4),
                fullSubject: s.name,
                A: calculateScore(s.id, prs[s.id]),
                timeText: formatMsToTime(prs[s.id]) || "N/A"
              }))}
            >
              <PolarGrid gridType="polygon" stroke="#353535" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#989177', fontSize: 10, fontWeight: 'bold' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-surface-container border border-outline/30 p-3 rounded-lg shadow-xl shrink-0">
                        <p className="text-primary font-bold uppercase text-xs mb-1 font-display">{data.fullSubject}</p>
                        <p className="text-on-surface font-mono text-lg font-bold">{data.timeText}</p>
                        <p className="text-outline text-[10px] uppercase font-bold tracking-widest">CAPACITY: <span className="text-on-surface">{data.A}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Radar name="Athlete" dataKey="A" stroke="#FFDE00" fill="#FFDE00" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {STATION_IDS.map((station, idx) => (
            <div key={station.id} className="bg-surface-container p-4 rounded-xl border border-outline/20 hover:border-primary/50 transition-colors flex flex-col group">
              <span className="font-display font-black text-outline text-2xl absolute opacity-10 -mt-2 -ml-1 select-none pointer-events-none group-hover:text-primary transition-colors">
                {(idx + 1).toString().padStart(2, '0')}
              </span>
              <div className="flex-1 z-10">
                <h3 className="text-sm font-bold uppercase italic font-display text-on-surface leading-tight mb-1">
                  {station.name}
                </h3>
                {station.noteKey && (
                  <p className="text-[10px] text-outline">{t(`benchmarks.stationNotes.${station.noteKey}`)}</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-b border-outline/30 pb-1 group-focus-within:border-primary transition-colors z-10">
                <Target className="w-3 h-3 text-outline group-focus-within:text-primary" />
                <div className="flex items-center font-mono text-lg font-black text-on-surface">
                  <select
                    title={`${station.name} min`}
                    className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer outline-none text-right appearance-none w-8"
                    value={(localPrs[station.id] || "").includes(":") ? localPrs[station.id].split(":")[0] : "--"}
                    onChange={(e) => {
                      const currentVal = localPrs[station.id] || "00:00";
                      const currentS = currentVal.includes(":") ? currentVal.split(":")[1] : "00";
                      handlePrChange(station.id, `${e.target.value}:${currentS}`);
                    }}
                  >
                    <option value="--" disabled className="bg-surface">--</option>
                    {Array.from({length: 60}, (_, i) => (
                      <option key={i} value={i.toString().padStart(2, '0')} className="bg-surface">{i.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-outline/50 mx-0.5 pb-0.5">:</span>
                  <select
                    title={`${station.name} sec`}
                    className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer outline-none text-left appearance-none w-8"
                    value={(localPrs[station.id] || "").includes(":") ? localPrs[station.id].split(":")[1] : "--"}
                    onChange={(e) => {
                      const currentVal = localPrs[station.id] || "00:00";
                      let currentM = currentVal.includes(":") ? currentVal.split(":")[0] : "00";
                      if (currentM === "--") currentM = "00";
                      handlePrChange(station.id, `${currentM}:${e.target.value}`);
                    }}
                  >
                    <option value="--" disabled className="bg-surface">--</option>
                    {Array.from({length: 60}, (_, i) => (
                      <option key={i} value={i.toString().padStart(2, '0')} className="bg-surface">{i.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <BottomNavBar />
    </div>
  );
}
