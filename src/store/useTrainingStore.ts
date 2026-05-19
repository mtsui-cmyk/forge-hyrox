import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LongTermPlan } from "@/lib/longTermPlan";
import type { RacePlan } from "@/lib/racePlan";
import type { ScheduledWorkoutRecord } from "@/lib/scheduledWorkout";
import type { WorkoutTemplate } from "@/lib/workoutLibrary";

export type WodBlock = {
  type: "WarmUp" | "MainSet" | "CoolDown" | "Strength" | "Relax";
  name: string; // e.g., "EMOM 24" or "3 Rounds"
  format: "For Time" | "EMOM" | "AMRAP" | "Rounds" | "ROUNDS" | "Sets" | "Relax" | "Intervals";
  details: string[]; // e.g., ["15 Cal SkiErg", "20 Wall Balls"]
  targetDuration?: number; // target time in mins
};

export type WOD = {
  date: string; // "YYYY-MM-DD"
  isRestDay: boolean;
  phase: string;
  title: string;
  description: string;
  planAdjustments?: string[];
  coachNotes?: string[];
  blocks: WodBlock[];
};

export type BlockLog = {
  timeTakenMs?: number; // for "For Time"
  repsCompleted?: number; // for AMRAP or EMOM
  notes?: string;
};

export type DailyLog = {
  date: string;
  totalTimeMs: number;
  blockLogs: Record<number, BlockLog>; // indexed by block array index
  completedAt: string; // ISO String
  rpe?: number; // Rate of Perceived Exertion (1-10)
};

interface TrainingState {
  microcycle: Record<string, WOD>;
  completedLogs: Record<string, DailyLog>;
  prs: Record<string, number>; // Station name -> time in ms
  longTermPlan: LongTermPlan | null;
  scheduledWorkouts: ScheduledWorkoutRecord[];
  workoutTemplates: WorkoutTemplate[];
  racePlans: RacePlan[];
  setMicrocycle: (plan: WOD[]) => void;
  updateWod: (date: string, updatedWod: WOD) => void;
  logWorkoutResult: (date: string, logData: DailyLog) => void;
  updatePR: (station: string, timeMs: number) => void;
  setPrs: (prsData: Record<string, number>) => void;
  setLongTermPlan: (plan: LongTermPlan | null) => void;
  setScheduledWorkouts: (workouts: ScheduledWorkoutRecord[]) => void;
  upsertScheduledWorkout: (workout: ScheduledWorkoutRecord) => void;
  setWorkoutTemplates: (templates: WorkoutTemplate[]) => void;
  upsertWorkoutTemplate: (template: WorkoutTemplate) => void;
  addRacePlan: (plan: RacePlan) => void;
  setRacePlans: (plans: RacePlan[]) => void;
  clearPlan: () => void;
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      microcycle: {},
      completedLogs: {},
      prs: {},
      longTermPlan: null,
      scheduledWorkouts: [],
      workoutTemplates: [],
      racePlans: [],

      setMicrocycle: (plan: WOD[]) => {
        set((state) => {
          const newCycle = { ...state.microcycle };
          plan.forEach((wod) => {
            newCycle[wod.date] = wod;
          });
          return { microcycle: newCycle };
        });
      },

      updateWod: (date: string, updatedWod: WOD) => {
        set((state) => ({
          microcycle: {
            ...state.microcycle,
            [date]: updatedWod,
          },
        }));
      },

      logWorkoutResult: (date: string, logData: DailyLog) => {
        set((state) => ({
          completedLogs: {
            ...state.completedLogs,
            [date]: logData,
          },
        }));
      },

      updatePR: (station: string, timeMs: number) => {
        set((state) => ({
          prs: {
            ...state.prs,
            [station]: timeMs,
          },
        }));
      },

      setPrs: (prsData: Record<string, number>) => {
        set({ prs: prsData });
      },

      setLongTermPlan: (plan: LongTermPlan | null) => {
        set({ longTermPlan: plan });
      },

      setScheduledWorkouts: (workouts: ScheduledWorkoutRecord[]) => {
        set({ scheduledWorkouts: workouts });
      },

      upsertScheduledWorkout: (workout: ScheduledWorkoutRecord) => {
        set((state) => ({
          scheduledWorkouts: [
            workout,
            ...state.scheduledWorkouts.filter((item) => item.id !== workout.id && item.date !== workout.date),
          ].sort((a, b) => a.date.localeCompare(b.date)),
        }));
      },

      setWorkoutTemplates: (templates: WorkoutTemplate[]) => {
        set({ workoutTemplates: templates });
      },

      upsertWorkoutTemplate: (template: WorkoutTemplate) => {
        set((state) => ({
          workoutTemplates: [
            template,
            ...state.workoutTemplates.filter((item) => item.id !== template.id),
          ],
        }));
      },

      addRacePlan: (plan: RacePlan) => {
        set((state) => ({ racePlans: [plan, ...state.racePlans] }));
      },

      setRacePlans: (plans: RacePlan[]) => {
        set({ racePlans: plans });
      },

      clearPlan: () => set({ microcycle: {}, completedLogs: {}, prs: {}, longTermPlan: null, scheduledWorkouts: [], workoutTemplates: [], racePlans: [] }),
    }),
    {
      name: "hyrox-training-storage", // localStorage key
    }
  )
);
