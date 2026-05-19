"use client";

import { Flame, LineChart, Target, TrendingUp } from "lucide-react";
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTranslation } from "@/components/I18nProvider";
import { useTrainingStore } from "@/store/useTrainingStore";
import { summarizeMetrics } from "@/lib/metrics";

const score = (ms?: number) => !ms ? 20 : Math.max(10, Math.min(100, Math.round(100 - (ms / 1000 - 210) / 3)));

export default function MetricsPage() {
  const { t } = useTranslation();
  const { completedLogs, prs, microcycle } = useTrainingStore();
  const summary = summarizeMetrics(completedLogs as any, Object.keys(microcycle).length);
  const radarData = Object.entries(prs).map(([station, timeMs]) => ({ station, score: score(timeMs) }));

  return (
    <div className="min-h-screen bg-background text-on-background pb-28">
      <header className="fixed top-0 z-50 w-full bg-[#131313] border-b border-outline/10">
        <div className="h-16 px-6 flex items-center gap-2 max-w-2xl mx-auto">
          <Flame className="w-5 h-5 text-primary fill-primary" />
          <h1 className="font-display font-black text-xl italic uppercase text-primary">FORGE <span className="text-on-surface">/ {t("metrics.title")}</span></h1>
        </div>
      </header>
      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-6">
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container rounded-xl p-4 border border-outline/20"><Target className="w-5 h-5 text-primary mb-2" /><p className="text-[10px] text-outline uppercase">{t("metrics.completed")}</p><p className="font-display font-black text-3xl">{summary.completedSessions}</p></div>
          <div className="bg-surface-container rounded-xl p-4 border border-outline/20"><TrendingUp className="w-5 h-5 text-primary mb-2" /><p className="text-[10px] text-outline uppercase">{t("metrics.completion")}</p><p className="font-display font-black text-3xl">{summary.completionRate}%</p></div>
          <div className="bg-surface-container rounded-xl p-4 border border-outline/20"><LineChart className="w-5 h-5 text-primary mb-2" /><p className="text-[10px] text-outline uppercase">{t("metrics.streak")}</p><p className="font-display font-black text-3xl">{summary.streak}</p></div>
          <div className="bg-surface-container rounded-xl p-4 border border-outline/20"><p className="text-[10px] text-outline uppercase">{t("metrics.painNotes")}</p><p className="font-display font-black text-3xl text-[#FF5A5F]">{summary.painNoteCount}</p></div>
        </section>
        <section className="bg-surface-container border border-outline/20 rounded-xl p-4 h-72">
          <h2 className="font-display font-black uppercase mb-3">{t("metrics.weaknessRadar")}</h2>
          <ResponsiveContainer width="100%" height="85%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="station" tick={{ fill: "#999", fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#FFE84D" fill="#FFE84D" fillOpacity={0.25} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </section>
        <section className="bg-surface-container border border-outline/20 rounded-xl p-4 h-64">
          <h2 className="font-display font-black uppercase mb-3">{t("metrics.weeklyLoad")}</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={summary.weeklyLoad}>
              <XAxis dataKey="week" tick={{ fill: "#999", fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="load" fill="#FFE84D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </main>
      <BottomNavBar />
    </div>
  );
}
