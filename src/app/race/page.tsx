"use client";

import { useState } from "react";
import { FastForward, Flame, Save } from "lucide-react";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTranslation } from "@/components/I18nProvider";
import { useTrainingStore } from "@/store/useTrainingStore";
import { buildRacePlan, msToClock } from "@/lib/racePlan";

export default function RacePage() {
  const { t } = useTranslation();
  const { addRacePlan, racePlans } = useTrainingStore();
  const [targetTime, setTargetTime] = useState("01:15:00");
  const [gender, setGender] = useState("Male");
  const [division, setDivision] = useState<"Open" | "Pro">("Open");
  const [manualWallBalls, setManualWallBalls] = useState("");
  const manual: Record<string, number> | undefined = manualWallBalls ? { WallBalls: Number(manualWallBalls) * 1000 } : undefined;
  const plan = buildRacePlan({ targetTime, gender, division, manualStationSplits: manual });

  return (
    <div className="min-h-screen bg-background text-on-background pb-28">
      <header className="fixed top-0 z-50 w-full bg-[#131313] border-b border-outline/10">
        <div className="h-16 px-6 flex items-center gap-2 max-w-2xl mx-auto">
          <Flame className="w-5 h-5 text-primary fill-primary" />
          <h1 className="font-display font-black text-xl italic uppercase text-primary">FORGE <span className="text-on-surface">/ {t("race.title")}</span></h1>
        </div>
      </header>
      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-6">
        <section className="bg-surface-container border border-outline/20 rounded-xl p-4 space-y-3">
          <FastForward className="w-8 h-8 text-primary" />
          <h2 className="font-display font-black text-3xl uppercase italic">{t("race.heading")}</h2>
          <input value={targetTime} onChange={(e) => setTargetTime(e.target.value.replace(/[^0-9:]/g, ""))} className="w-full bg-surface rounded-lg p-3 text-3xl font-mono text-primary text-center" />
          <div className="grid grid-cols-2 gap-3">
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="bg-surface rounded-lg p-3 text-xs"><option>Male</option><option>Female</option></select>
            <select value={division} onChange={(e) => setDivision(e.target.value as "Open" | "Pro")} className="bg-surface rounded-lg p-3 text-xs"><option>Open</option><option>Pro</option></select>
          </div>
          <input value={manualWallBalls} onChange={(e) => setManualWallBalls(e.target.value.replace(/[^0-9]/g, ""))} placeholder={t("race.manualWallBalls")} className="w-full bg-surface rounded-lg p-3 text-xs" />
          <button onClick={() => addRacePlan(plan)} className="w-full bg-primary text-on-primary rounded-xl p-4 font-display font-black uppercase text-xs flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {t("race.savePlan")}</button>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container rounded-xl p-4 border border-outline/20">
            <p className="text-[10px] text-outline uppercase">{t("race.projected")}</p>
            <p className="font-mono text-2xl font-black text-primary">{msToClock(plan.projectedTimeMs)}</p>
          </div>
          <div className="bg-surface-container rounded-xl p-4 border border-outline/20">
            <p className="text-[10px] text-outline uppercase">{t("race.roxzone")}</p>
            <p className="font-mono text-2xl font-black text-primary">{msToClock(plan.roxzoneMs)}</p>
          </div>
        </section>
        <section className="bg-surface-container border border-outline/20 rounded-xl p-4">
          <h3 className="font-display font-black uppercase text-lg mb-3">{t("race.runSplits")}</h3>
          {plan.runSplits.map((split) => <div key={split.id} className="flex justify-between py-2 border-b border-outline/10 text-sm"><span>{split.name}</span><span className="font-mono">{msToClock(split.targetMs)}</span></div>)}
        </section>
        <section className="bg-surface-container border border-outline/20 rounded-xl p-4">
          <h3 className="font-display font-black uppercase text-lg mb-3">{t("race.stationSplits")}</h3>
          {plan.stationSplits.map((split) => <div key={split.id} className="flex justify-between py-2 border-b border-outline/10 text-sm"><span>{split.name}{split.manual ? " *" : ""}</span><span className="font-mono">{msToClock(split.targetMs)}</span></div>)}
        </section>
        {racePlans.length > 0 && <p className="text-xs text-outline">{t("race.savedCount", { count: racePlans.length })}</p>}
      </main>
      <BottomNavBar />
    </div>
  );
}
