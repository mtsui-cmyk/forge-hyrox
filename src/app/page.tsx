"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Flame, LogOut, PlayCircle } from "lucide-react";
import { useTranslation, LanguageToggle } from "@/components/I18nProvider";

export default function Home() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const { t } = useTranslation();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center kinetic-texture bg-surface text-on-surface font-sans selection:bg-primary selection:text-on-primary overflow-hidden relative">
      {/* Background glow styling */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] bg-primary opacity-[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[20%] right-[0%] w-[500px] h-[500px] bg-primary opacity-[0.02] blur-[100px] rounded-full"></div>
      </div>

      {/* Language toggle — top right */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageToggle />
      </div>

      <div className="max-w-md w-full z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-surface-container-high rounded-3xl flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-outline/30">
            <Flame className="text-primary w-12 h-12 fill-primary drop-shadow-[0_0_15px_rgba(255,222,0,0.6)]" />
          </div>
        </div>
        
        <div>
          <h1 className="text-6xl font-black tracking-tighter sm:text-7xl text-primary italic uppercase font-display leading-none">
            {t("app.name")}<br/> <span className="text-on-surface text-3xl mt-2 block">{t("app.slogan")}</span>
          </h1>
          <p className="text-[10px] font-bold text-outline uppercase tracking-[0.4em] mt-6 border-t border-outline/30 pt-4 mx-auto w-fit">
            HYROX RACE ENGINE
          </p>
        </div>
        
        <p className="text-sm text-on-surface/60 font-medium font-sans max-w-sm mx-auto">
          {t("app.tagline")}
        </p>

        {status === "loading" ? (
          <div className="pt-8 flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-surface-container border-t-primary rounded-full" />
          </div>
        ) : isLoggedIn ? (
          /* Already logged in — show entry to dashboard */
          <div className="pt-8 space-y-4">
            <p className="text-xs text-on-surface/40 font-bold uppercase tracking-widest mb-2 font-display">
              {t("landing.loggedInAs")}: <span className="text-primary lowercase">{session?.user?.email}</span>
            </p>
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-full py-5 bg-gradient-to-b from-[#FFE84D] to-[#FFDE00] text-on-primary font-black font-display rounded-xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 uppercase tracking-widest shadow-[0_10px_30px_rgba(255,222,0,0.2)]"
            >
              {t("landing.enterDashboard")} <Flame className="w-5 h-5 ml-2 fill-on-primary" />
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("hyroxProfile");
                localStorage.removeItem("hyroxEquipment");
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center justify-center w-full py-4 text-outline font-bold rounded-xl text-xs transition-colors uppercase tracking-[0.2em] hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" /> {t("landing.switchAccount")}
            </button>
          </div>
        ) : (
          /* Not logged in — show register / login */
          <div className="pt-8 space-y-4">
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-5 bg-gradient-to-b from-[#FFE84D] to-[#FFDE00] text-on-primary font-black font-display rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 uppercase tracking-widest shadow-[0_10px_30px_rgba(255,222,0,0.2)] text-base"
            >
              {t("landing.login")}
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center w-full py-4 bg-surface-container-high border border-outline/30 text-on-surface font-bold font-display rounded-xl transition-colors uppercase tracking-widest hover:bg-surface-container-highest text-sm shadow-xl"
            >
              {t("landing.register")}
            </Link>
            <Link
              href="/demo"
              className="flex items-center justify-center w-full py-4 bg-transparent border border-primary/40 text-primary font-bold font-display rounded-xl transition-colors uppercase tracking-widest hover:bg-primary/10 text-sm"
            >
              <PlayCircle className="w-4 h-4 mr-2" /> {t("landing.tryDemo")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
