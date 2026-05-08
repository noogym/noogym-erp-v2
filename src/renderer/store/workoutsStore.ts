import { create } from "zustand";
import { workouts as mockWorkouts } from "../data/mock";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { WorkoutRecord } from "./domainTypes";

const initial: WorkoutRecord[] = mockWorkouts.map((workout) => ({ ...workout, id: uid("TRN") }));
const persist = (workouts: WorkoutRecord[]) => writeLocal("noogym:workouts", workouts);

export const useWorkoutsStore = create<{
  workouts: WorkoutRecord[];
  addWorkout: (workout: Partial<WorkoutRecord>) => void;
  updateWorkout: (id: string, workout: Partial<WorkoutRecord>) => void;
  duplicateWorkout: (id: string) => void;
  deleteWorkout: (id: string) => void;
}>((set, get) => ({
  workouts: readLocal("noogym:workouts", initial),
  addWorkout: (workout) => set((state) => {
    const workouts = [{ id: uid("TRN"), name: "Novo treino", client: "Carlos Alberto Silva", goal: "Hipertrofia", author: "Admin", updated: "Hoje, 10:30", status: "Ativo", exercises: 5, ...workout }, ...state.workouts];
    persist(workouts); useAppStore.getState().addPendingSync(); return { workouts };
  }),
  updateWorkout: (id, workout) => set((state) => {
    const workouts = state.workouts.map((item) => item.id === id ? { ...item, ...workout } : item);
    persist(workouts); useAppStore.getState().addPendingSync(); return { workouts };
  }),
  duplicateWorkout: (id) => {
    const workout = get().workouts.find((item) => item.id === id);
    if (workout) get().addWorkout({ ...workout, id: uid("TRN"), name: `${workout.name} Cópia` });
  },
  deleteWorkout: (id) => set((state) => {
    const workouts = state.workouts.filter((item) => item.id !== id);
    persist(workouts); useAppStore.getState().addPendingSync(); return { workouts };
  })
}));
