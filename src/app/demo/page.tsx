"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { useTranslation } from "@/components/I18nProvider";
import { seedDemoWorkspace } from "@/lib/demoMode";

export default function DemoPage() {
  const router = useRouter();
  const { lang } = useTranslation();

  useEffect(() => {
    seedDemoWorkspace(lang === "zh" ? "zh" : "en");
    router.replace("/dashboard");
  }, [lang, router]);

  return (
    <main className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-6 text-center">
      <Flame className="w-12 h-12 text-primary fill-primary mb-4" />
      <h1 className="font-display text-3xl font-black italic uppercase tracking-tight text-primary">FORGE DEMO</h1>
      <p className="mt-3 text-xs text-outline uppercase tracking-widest">Loading sample HYROX coach workspace</p>
    </main>
  );
}
