"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, User, Flame, Settings2, LogOut, ChevronRight } from "lucide-react";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "@/components/I18nProvider";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const savedData = localStorage.getItem("hyroxProfile");
    if (savedData) {
      setProfile(JSON.parse(savedData));
    } else {
      router.push("/onboarding");
    }
  }, [router]);

  if (!profile) return null;

  return (
    <div className="bg-background text-on-background antialiased pb-24 min-h-screen">
      {/* TopAppBar Shell */}
      <header className="bg-[#131313] fixed top-0 w-full z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-b border-outline/10">
        <div className="flex justify-between items-center px-6 h-16 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
             <Flame className="w-5 h-5 text-primary fill-primary" />
             <h1 className="font-display font-black tracking-tighter uppercase text-xl text-primary italic">FORGE <span className="text-on-surface text-sm">/ {t("profile.title")}</span></h1>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => router.push("/equipment")}
              className="text-on-surface/60 hover:text-primary transition-colors"
              aria-label={t("profile.settings")}
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem("hyroxProfile");
                localStorage.removeItem("hyroxEquipment");
                signOut({ callbackUrl: '/' });
              }}
              className="text-error/60 hover:text-error transition-colors"
              aria-label={t("profile.logout")}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 space-y-8 max-w-2xl mx-auto">
        <section className="flex flex-col items-center mb-8 relative">
          <div className="w-32 h-32 rounded-full bg-surface-container-high shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center justify-center mb-6 text-on-surface border border-outline/20 z-10">
            <User className="w-12 h-12 opacity-80" strokeWidth={1.5} />
          </div>
          <div className="absolute top-10 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent z-0 blur-[2px]"></div>
          
          <h2 className="text-3xl font-black uppercase tracking-tighter text-primary font-display mb-1">
            {session?.user?.email?.split('@')[0] || t("profile.athlete")}
          </h2>
          <span className="font-mono text-[10px] text-outline uppercase tracking-[0.3em] bg-surface-container-high px-3 py-1 rounded-full border border-outline/20 hidden md:inline-block">
             HYROX ID: HK-{(session?.user?.email || "athlete").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0).toString().padStart(6, "0").slice(-6)}
          </span>
        </section>

        <section className="space-y-4">
           {/* Level Badge */}
           <div className="bg-surface-container p-4 rounded-xl border border-outline/20 flex justify-between items-center">
              <div>
                 <span className="font-display text-[9px] font-bold tracking-widest uppercase text-outline block mb-0.5">{t("profile.bracket")}</span>
                 <span className="font-display font-black text-lg text-on-surface uppercase">
                   {profile.category}
                 </span>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center">
                 <span className="font-display font-black text-primary text-xl">{profile.ageGroup?.split('-')[0] || '30'}</span>
              </div>
           </div>

           {/* Metrics Grid */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10">
                 <span className="font-display text-[9px] font-bold tracking-widest uppercase text-outline block mb-1">{t("profile.weightSex")}</span>
                 <span className="font-mono font-black text-2xl text-on-surface">{profile.weight || '--'}<span className="text-sm text-outline ml-1">KG</span></span> / <span className="font-bold text-sm text-on-surface uppercase">{profile.gender}</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10">
                 <span className="font-display text-[9px] font-bold tracking-widest uppercase text-outline block mb-1">{t("profile.targetPace")}</span>
                 <span className="font-mono font-black text-2xl text-primary">{profile.targetTime || '--:--'}</span>
              </div>
           </div>
        </section>

        <section className="space-y-3 pt-6 border-t border-outline/10">
           <button
             onClick={() => router.push("/onboarding")}
             className="w-full bg-surface-container-high hover:bg-surface-container-highest transition-colors p-4 rounded-xl border border-outline/20 flex items-center justify-between group"
           >
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                 </div>
                 <div className="text-left">
                    <h4 className="font-display font-bold uppercase text-sm tracking-widest text-on-surface group-hover:text-primary transition-colors">{t("profile.editProfile")}</h4>
                    <p className="font-sans text-[10px] text-outline">{t("profile.editProfileDesc")}</p>
                 </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
           </button>

           <button
             onClick={() => router.push("/equipment")}
             className="w-full bg-surface-container-high hover:bg-surface-container-highest transition-colors p-4 rounded-xl border border-outline/20 flex items-center justify-between group"
           >
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Settings2 className="w-4 h-4" />
                 </div>
                 <div className="text-left">
                    <h4 className="font-display font-bold uppercase text-sm tracking-widest text-on-surface group-hover:text-primary transition-colors">{t("profile.equipment")}</h4>
                    <p className="font-sans text-[10px] text-outline">{t("profile.equipmentDesc")}</p>
                 </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
           </button>
        </section>
      </main>

      <BottomNavBar />
    </div>
  );
}
