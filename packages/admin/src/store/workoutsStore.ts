import { create } from "zustand";
import { workouts as mockWorkouts } from "../data/mock";
import { createResource, deleteResource, listResource, updateResource, workoutFromApi, workoutToDto } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { WorkoutRecord } from "@noogym/types";

const initial: WorkoutRecord[] = mockWorkouts.map((workout) => ({ ...workout, id: uid("TRN") }));
const persist = (workouts: WorkoutRecord[]) => writeLocal("noogym:workouts", workouts);

export const useWorkoutsStore = create<{
  workouts: WorkoutRecord[];
  loadOnline: () => Promise<void>;
  addWorkout: (workout: Partial<WorkoutRecord>) => void;
  updateWorkout: (id: string, workout: Partial<WorkoutRecord>) => void;
  duplicateWorkout: (id: string) => void;
  deleteWorkout: (id: string) => void;
}>((set, get) => ({
  workouts: readLocal("noogym:workouts", initial),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiWorkouts = await listResource<Record<string, unknown>>("workouts", token);
    const workouts = apiWorkouts.map(workoutFromApi);
    persist(workouts);
    set({ workouts });
  },
  addWorkout: (workout) => set((state) => {
    const created: WorkoutRecord = { id: uid("TRN"), name: "Novo treino", client: "Carlos Alberto Silva", goal: "Hipertrofia", author: "Admin", updated: "Hoje, 10:30", status: "Ativo", exercises: 5, ...workout };
    const workouts = [created, ...state.workouts];
    persist(workouts);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("workouts", token, workoutToDto(created))
        .then((apiWorkout) => {
          const synced = workoutFromApi(apiWorkout);
          const nextWorkouts = get().workouts.map((item) => item.id === created.id ? synced : item);
          persist(nextWorkouts);
          set({ workouts: nextWorkouts });
        })
        .catch(console.error);
    }

    return { workouts };
  }),
  updateWorkout: (id, workout) => set((state) => {
    const nextWorkout = { ...state.workouts.find((item) => item.id === id), ...workout };
    const workouts = state.workouts.map((item) => item.id === id ? { ...item, ...workout } : item);
    persist(workouts);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("workouts", id, token, workoutToDto(nextWorkout))
        .then((apiWorkout) => {
          const synced = workoutFromApi(apiWorkout);
          const nextWorkouts = get().workouts.map((item) => item.id === id ? synced : item);
          persist(nextWorkouts);
          set({ workouts: nextWorkouts });
        })
        .catch(console.error);
    }

    return { workouts };
  }),
  duplicateWorkout: (id) => {
    const workout = get().workouts.find((item) => item.id === id);
    if (workout) get().addWorkout({ ...workout, id: uid("TRN"), name: `${workout.name} Copia` });
  },
  deleteWorkout: (id) => set((state) => {
    const workouts = state.workouts.filter((item) => item.id !== id);
    persist(workouts);
    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) deleteResource("workouts", id, token).catch(console.error);
    return { workouts };
  })
}));
