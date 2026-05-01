"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, Flame, Save } from "lucide-react";
import { useTranslation } from "@/components/I18nProvider";

export default function EquipmentSettings() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [equipment, setEquipment] = useState({
    skiErg: true,
    rower: true,
    sled: true,
    wallBall: true,
    kettlebells: true,
    dumbbells: true,
    sandbag: false,
    pullUpBar: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hyroxEquipment");
    if (saved) setEquipment(JSON.parse(saved));
  }, []);

  const handleToggle = (key: keyof typeof equipment) => {
    setEquipment(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem("hyroxEquipment", JSON.stringify(equipment));
    try {
      const savedProfile = localStorage.getItem("hyroxProfile");
      const profile = savedProfile ? JSON.parse(savedProfile) : null;
      if (profile) {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileData: { profile, equipment } }),
        });
        if (!res.ok) throw new Error("Equipment sync failed");
      }
      router.push("/profile");
    } catch (error) {
      console.error(error);
      alert(t("equipment.syncError"));
    } finally {
      setIsSaving(false);
    }
  };

  const isEnglish = lang === "en";
  const equipList = [
    { key: "skiErg", label: "SkiErg", desc: isEnglish ? "For 1000m ski" : "用于 1000m 滑雪机" },
    { key: "rower", label: isEnglish ? "Rowing Machine" : "划船机", desc: isEnglish ? "For 1000m row" : "用于 1000m 划船" },
    { key: "sled", label: isEnglish ? "Weighted Sled" : "负重雪橇", desc: isEnglish ? "Turf track required" : "需要草皮跑道" },
    { key: "wallBall", label: isEnglish ? "Wall Balls" : "墙球", desc: isEnglish ? "Standard 4-9kg" : "标准 4-9kg" },
    { key: "kettlebells", label: isEnglish ? "Kettlebells" : "壶铃", desc: isEnglish ? "Farmer carry load" : "农夫走负重" },
    { key: "dumbbells", label: isEnglish ? "Dumbbells" : "哑铃", desc: isEnglish ? "Substitution-friendly load" : "适合作为替代负重" },
    { key: "sandbag", label: isEnglish ? "Sandbag" : "沙袋", desc: isEnglish ? "Lunges and carries" : "用于弓步与搬运" },
    { key: "pullUpBar", label: isEnglish ? "Pull-Up Bar" : "引体向上杆", desc: isEnglish ? "Grip and core access" : "用于握力与核心训练" },
  ];

  return (
    <div className="bg-background text-on-background antialiased pb-24 min-h-screen">
      {/* TopAppBar Shell */}
      <header className="bg-[#131313] fixed top-0 w-full z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-b border-outline/10">
        <div className="flex justify-between items-center px-4 h-16 max-w-2xl mx-auto">
          <button 
            onClick={() => router.push("/profile")}
            className="flex items-center text-on-surface/60 hover:text-primary transition-colors pr-4 py-2"
            aria-label={t("workout.back")}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-1 items-center">
             <Flame className="w-4 h-4 text-primary fill-primary" />
	             <h1 className="font-display font-black tracking-tighter uppercase text-sm text-on-surface">FORGE <span className="text-on-surface/50">/ {t("equipment.headerShort")}</span></h1>
          </div>

          <div className="w-[40px]">
            {/* Empty block to center title */}
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 space-y-6 max-w-2xl mx-auto">
        <section className="mb-6">
          <h2 className="text-3xl font-extrabold italic uppercase font-display text-primary tracking-tighter leading-none mb-1">
	            {t("equipment.title")}
	          </h2>
	          <p className="font-sans text-xs text-outline leading-relaxed max-w-xs">{t("equipment.desc")}</p>
        </section>

        <section className="grid grid-cols-1 gap-3">
          {equipList.map((item) => (
            <button
              key={item.key}
              onClick={() => handleToggle(item.key as keyof typeof equipment)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] ${
                equipment[item.key as keyof typeof equipment]
                  ? "bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(255,222,0,0.1)]"
                  : "bg-surface-container border-outline/10 text-on-surface/40 hover:bg-surface-container-high"
              }`}
            >
              <div className="text-left flex-1 pl-2">
                <div className={`font-display font-bold uppercase tracking-widest text-sm mb-0.5 transition-colors ${
                  equipment[item.key as keyof typeof equipment] ? "text-primary" : "text-on-surface/60"
                }`}>
                  {item.label}
                </div>
                <div className="text-[10px] font-sans text-outline/80">{item.desc}</div>
              </div>
              <div className={`w-6 h-6 rounded border transition-colors flex items-center justify-center shrink-0 ml-4 ${
                  equipment[item.key as keyof typeof equipment] 
                    ? "bg-primary border-primary text-on-primary" 
                    : "bg-surface border-outline/30 text-transparent hover:border-outline/50"
              }`}>
                 <Check className="w-4 h-4" strokeWidth={3} />
              </div>
            </button>
          ))}
        </section>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-8 py-5 kinetic-gradient text-on-primary font-black font-display uppercase tracking-widest text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(255,222,0,0.2)] flex items-center justify-center gap-2 sticky bottom-6 z-20"
        >
	          <Save className="w-5 h-5" /> {isSaving ? t("equipment.syncing") : t("equipment.save")}
        </button>
      </main>
    </div>
  );
}
