"use client";

import { createDemoCompletedLogs, createDemoMicrocycle, DEMO_EQUIPMENT, DEMO_PROFILE, DEMO_PRS, todayDateString } from "./demoData";
import { useTrainingStore } from "@/store/useTrainingStore";

const DEMO_FLAG = "forgeDemoMode";
const DEMO_COOKIE = "forge-demo";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(DEMO_FLAG) === "true" ||
    document.cookie.split("; ").some((item) => item === `${DEMO_COOKIE}=1`)
  );
}

export function disableDemoMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_FLAG);
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function seedDemoWorkspace(lang: "en" | "zh" = "en", startDate = todayDateString()) {
  if (typeof window === "undefined") return;

  const microcycle = createDemoMicrocycle(startDate, lang);
  const completedLogs = createDemoCompletedLogs(startDate);
  const store = useTrainingStore.getState();

  localStorage.setItem(DEMO_FLAG, "true");
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  localStorage.setItem("hyroxProfile", JSON.stringify(DEMO_PROFILE));
  localStorage.setItem("hyroxEquipment", JSON.stringify(DEMO_EQUIPMENT));
  localStorage.setItem(`hyroxTodayEquipment:${startDate}`, JSON.stringify(DEMO_EQUIPMENT));

  store.clearPlan();
  store.setMicrocycle(microcycle as any);
  store.setPrs(DEMO_PRS);
  for (const [date, log] of Object.entries(completedLogs)) {
    store.logWorkoutResult(date, log as any);
  }
}

export { DEMO_EQUIPMENT, DEMO_PROFILE, DEMO_PRS, createDemoCompletedLogs, createDemoMicrocycle, todayDateString };
