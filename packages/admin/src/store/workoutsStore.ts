import { create } from "zustand";
import { workouts as mockWorkouts } from "../data/mock";
import { createResource, deleteResource, listResource, updateResource, workoutFromApi, workoutToDto } from "../lib/domainApi";
import { readLocal, readLocalDb, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { WorkoutRecord } from "@noogym/types";

const defaultBlocks = (goal?: string) => [
  {
    id: uid("BLK"),
    name: "Aquecimento",
    exercises: [
      { id: uid("EXR"), name: "Esteira leve", group: "Cardio", equipment: "Esteira", sets: 1, reps: "8 min", load: "Leve", rest: "30s", notes: "Preparar articulacoes" }
    ]
  },
  {
    id: uid("BLK"),
    name: goal === "Emagrecimento" ? "Circuito principal" : "Forca principal",
    exercises: [
      { id: uid("EXR"), name: "Agachamento livre", group: "Pernas", equipment: "Barra", sets: 4, reps: "10-12", load: "Moderada", rest: "75s", notes: "Controlar amplitude" },
      { id: uid("EXR"), name: "Supino reto", group: "Peito", equipment: "Barra", sets: 4, reps: "8-10", load: "Progressiva", rest: "90s", notes: "Escapulas firmes" }
    ]
  }
];

const normalizeWorkout = (workout: WorkoutRecord): WorkoutRecord => {
  const blocks = workout.blocks?.length ? workout.blocks : defaultBlocks(workout.goal);
  const exercises = blocks.reduce((total, block) => total + block.exercises.length, 0) || workout.exercises || 0;
  return {
    level: "Intermediario",
    duration: "60 min",
    frequency: "3x por semana",
    type: "Cliente",
    reviewDate: "30 dias",
    notes: "",
    ...workout,
    blocks,
    exercises
  };
};

const initial: WorkoutRecord[] = mockWorkouts.map((workout) => normalizeWorkout({ ...workout, id: uid("TRN") }));
const persist = (workouts: WorkoutRecord[], sync = false) => writeLocal("noogym:workouts", workouts, { sync });

export const useWorkoutsStore = create<{
  workouts: WorkoutRecord[];
  loadLocal: () => Promise<void>;
  loadOnline: () => Promise<void>;
  addWorkout: (workout: Partial<WorkoutRecord>) => void;
  updateWorkout: (id: string, workout: Partial<WorkoutRecord>) => void;
  duplicateWorkout: (id: string) => void;
  setWorkoutStatus: (id: string, status: string) => void;
  deleteWorkout: (id: string) => void;
}>((set, get) => ({
  workouts: readLocal("noogym:workouts", initial).map(normalizeWorkout),
  loadLocal: async () => {
    const workouts = (await readLocalDb("noogym:workouts", initial)).map(normalizeWorkout);
    persist(workouts);
    set({ workouts });
  },
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiWorkouts = await listResource<Record<string, unknown>>("workouts", token);
    const workouts = apiWorkouts.map(workoutFromApi).map(normalizeWorkout);
    persist(workouts, true);
    set({ workouts });
  },
  addWorkout: (workout) => set((state) => {
    const created: WorkoutRecord = normalizeWorkout({ id: uid("TRN"), name: "Novo treino", client: "Carlos Alberto Silva", goal: "Hipertrofia", author: "Admin", updated: "Hoje, 10:30", status: "Ativo", exercises: 0, ...workout });
    const workouts = [created, ...state.workouts];
    persist(workouts, true);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("workouts", token, workoutToDto(created))
        .then((apiWorkout) => {
          const synced = normalizeWorkout(workoutFromApi(apiWorkout));
          const nextWorkouts = get().workouts.map((item) => item.id === created.id ? synced : item);
          persist(nextWorkouts);
          set({ workouts: nextWorkouts });
        })
        .catch(console.error);
    }

    return { workouts };
  }),
  updateWorkout: (id, workout) => set((state) => {
    const nextWorkout = normalizeWorkout({ ...state.workouts.find((item) => item.id === id), ...workout } as WorkoutRecord);
    const workouts = state.workouts.map((item) => item.id === id ? nextWorkout : item);
    persist(workouts);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("workouts", id, token, workoutToDto(nextWorkout))
        .then((apiWorkout) => {
          const synced = normalizeWorkout(workoutFromApi(apiWorkout));
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
    if (workout) get().addWorkout({ ...workout, id: undefined, name: `${workout.name} Copia`, status: "Rascunho", updated: "Agora" });
  },
  setWorkoutStatus: (id, status) => get().updateWorkout(id, { status, updated: "Agora" }),
  deleteWorkout: (id) => set((state) => {
    const workouts = state.workouts.filter((item) => item.id !== id);
    persist(workouts, true);
    useAppStore.getState().addPendingSync();
    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) deleteResource("workouts", id, token).catch(console.error);
    return { workouts };
  })
}));
